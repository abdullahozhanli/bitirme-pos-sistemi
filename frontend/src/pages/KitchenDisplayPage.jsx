import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Chip, Button, Stack, Paper, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';

const COLS = [
  { key: 'pending_or_progress', title: 'Hazırlama', bg: '#fff8f0' },
  { key: 'ready', title: 'Hazır', bg: '#f2fff5' },
  { key: 'served', title: 'Servis Edildi', bg: '#f6f7fb' },
];

export default function KitchenDisplayPage() {
  const { isAuthenticated } = useAuth?.() || { isAuthenticated: true };
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const API = import.meta?.env?.VITE_API_URL || 'http://localhost:5001';

  const fetchOrders = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API}/api/kitchen/orders`, {
        headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {},
      });
      const list = Array.isArray(data) ? data : (data?.items || []);
      setOrders(list);
    } catch (e) {
      console.error('Orders fetch failed:', e);
      setError(e.response?.data?.message || e.message || 'Siparişler yüklenemedi');
    }
  };

  useEffect(() => { 
    fetchOrders(); 
    // Her 5 saniyede bir siparişleri güncelle
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sipariş kalemlerini normalize et
  const items = useMemo(() => {
    const rows = [];
    (orders || []).forEach((o) => {
      (o.items || []).forEach((it, idx) => {
        rows.push({
          orderId: o._id || o.id,
          itemIndex: idx,
          tableName: o.table?.name || '—',
          notes: o.notes || it.note || '',
          productName: it.name,
          qty: it.qty,
          status: o.status || 'hazirlaniyor', // Order-level status
          createdAt: o.createdAt,
        });
      });
    });
    return rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [orders]);

  const grouped = useMemo(() => ({
    pending_or_progress: items.filter((r) => r.status === 'hazirlaniyor'),
    ready: items.filter((r) => r.status === 'serviste'),
    served: items.filter((r) => r.status === 'tamamlandi' || r.status === 'iptal'),
  }), [items]);

  const updateItem = async (orderId, itemIndex, status) => {
    try {
      const token = localStorage.getItem('token');
      // Mutfak endpoint'i kullan
      await axios.patch(
        `${API}/api/kitchen/orders/${orderId}/status`,
        { status },
        { headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {} }
      );
      await fetchOrders();
    } catch (e) {
      console.error('Kalem durumu güncellenemedi:', e);
    }
  };

  const Card = ({ row }) => (
    <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={700}>{row.productName}</Typography>
          <Chip size="small" label={`Masa ${row.tableName}`} />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Adet: {row.qty}
        </Typography>

        {row.notes && (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            Not: {row.notes}
          </Typography>
        )}

        <Stack direction="row" spacing={1} pt={1}>
          {row.status === 'hazirlaniyor' && (
            <Button variant="contained" onClick={() => updateItem(row.orderId, row.itemIndex, 'serviste')}>
              Serviste Yap
            </Button>
          )}
          {row.status === 'serviste' && (
            <Button variant="contained" color="success" onClick={() => updateItem(row.orderId, row.itemIndex, 'tamamlandi')}>
              Tamamlandı
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={800} mb={2}>Mutfak Ekranı</Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {COLS.map((col) => (
          <Box key={col.key} sx={{ flex: 1, bgcolor: col.bg, borderRadius: 2, p: 2, minHeight: 420 }}>
            <Typography fontWeight={700} mb={1}>{col.title}</Typography>
            {grouped[col.key].map((r) => (
              <Card key={`${r.orderId}-${r.itemIndex}`} row={r} />
            ))}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}


