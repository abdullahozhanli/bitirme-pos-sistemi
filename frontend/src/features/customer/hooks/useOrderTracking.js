import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

function statusLabel(s) {
  const x = String(s || '').toLowerCase();
  const map = {
    hazirlaniyor: 'Hazırlanıyor',
    serviste: 'Serviste',
    tamamlandi: 'Tamamlandı',
    iptal: 'İptal',
    ödendi: 'Ödendi',
    paid: 'Ödendi',
  };
  return map[x] || s || '—';
}

/**
 * Sipariş durumu: polling + isteğe bağlı Socket.io (giriş yapmış müşteri)
 */
export default function useOrderTracking(orderId, { token, userId, enabled = true, pollMs = 5000 } = {}) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    if (!orderId || !enabled) return;
    setLoading(true);
    setError('');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`/api/orders/${orderId}`, { headers });
      setStatus(res.data?.status || '');
    } catch (e) {
      setError(e?.response?.data?.message || 'Durum alınamadı');
    } finally {
      setLoading(false);
    }
  }, [orderId, token, enabled]);

  useEffect(() => {
    if (!orderId || !enabled) return undefined;
    fetchStatus();
    const id = setInterval(fetchStatus, pollMs);
    return () => clearInterval(id);
  }, [orderId, enabled, pollMs, fetchStatus]);

  useEffect(() => {
    if (!orderId || !enabled || !token || !userId) return undefined;

    const baseURL = import.meta.env?.VITE_API_URL || window.location.origin;
    const socket = io(baseURL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socket.on('connect', () => {
      socket.emit('subscribe:customer', { userId });
    });

    socket.on('order:status:updated', (payload) => {
      if (payload?.orderId === String(orderId)) {
        setStatus(payload.status || '');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, token, userId, enabled]);

  return {
    status,
    statusLabel: statusLabel(status),
    loading,
    error,
    refresh: fetchStatus,
  };
}
