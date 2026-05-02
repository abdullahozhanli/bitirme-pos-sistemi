import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Socket.io client hook
 * @param {string} room - Subscribe olunacak room (örn: 'tables')
 * @param {object} callbacks - Event callback'leri
 * @returns {object} - { socket, connected }
 */
export default function useSocket(room, callbacks = {}) {
  const socketRef = useRef(null);
  const callbacksRef = useRef(callbacks);
  const [connected, setConnected] = useState(false);

  // Callbacks'i güncelle
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    // Socket bağlantısı oluştur
    const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';
    const socket = io(baseURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Bağlantı başarılı
    socket.on('connect', () => {
      console.log('✅ Socket.io bağlandı:', socket.id);
      setConnected(true);
      
      // Room'a subscribe ol (eğer room string ise)
      if (room && typeof room === 'string') {
        socket.emit(`subscribe:${room}`);
        console.log(`📡 Room'a katıldı: ${room}`);
      }
    });

    // Bağlantı kesildi
    socket.on('disconnect', () => {
      console.log('❌ Socket.io bağlantısı kesildi');
      setConnected(false);
    });

    // Hata
    socket.on('connect_error', (error) => {
      console.error('Socket.io bağlantı hatası:', error);
      setConnected(false);
    });

    // Event listener'ları ekle
    Object.keys(callbacks).forEach((event) => {
      socket.on(event, (data) => {
        const callback = callbacksRef.current[event];
        if (callback) {
          callback(data);
        }
      });
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      
      // Tüm event listener'ları kaldır
      Object.keys(callbacks).forEach((event) => {
        socket.off(event);
      });
      
      socket.disconnect();
      setConnected(false);
      console.log('🔌 Socket.io bağlantısı kapatıldı');
    };
  }, [room]);

  return {
    socket: socketRef.current,
    connected: connected,
  };
}








