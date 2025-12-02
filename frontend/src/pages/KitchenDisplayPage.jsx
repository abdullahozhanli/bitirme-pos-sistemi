import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Box, 
  Typography, 
  Chip, 
  Button, 
  Stack, 
  Paper, 
  Alert,
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NoteIcon from '@mui/icons-material/Note';
import DescriptionIcon from '@mui/icons-material/Description';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PersonIcon from '@mui/icons-material/Person';
import './KitchenDisplayPage.css';

const API = import.meta?.env?.VITE_API_URL || 'http://localhost:5001';

export default function KitchenDisplayPage() {
  const { isAuthenticated } = useAuth?.() || { isAuthenticated: true };
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const fetchTimeoutRef = useRef(null);

  const fetchOrders = async () => {
    try {
      setError('');
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API}/api/kitchen/orders`, {
        headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {},
      });
      const list = Array.isArray(data) ? data : (data?.items || data?.orders || []);
      setOrders(list);
      // Debug: Sipariş sayısını ve item yapısını logla
      if (list.length > 0) {
        console.log(`✅ ${list.length} sipariş yüklendi`);
        // İlk siparişin yapısını kontrol et
        const firstOrder = list[0];
        console.log('📦 İlk sipariş yapısı:', {
          orderId: firstOrder._id,
          hasOrderItems: !!firstOrder.orderItems,
          orderItemsLength: firstOrder.orderItems?.length || 0,
          hasItems: !!firstOrder.items,
          itemsLength: firstOrder.items?.length || 0,
          firstItem: firstOrder.orderItems?.[0] || firstOrder.items?.[0]
        });
      }
    } catch (e) {
      console.error('Orders fetch failed:', e);
      setError(e.response?.data?.message || e.message || 'Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchOrders(); 
    
    // Socket.io bağlantısı
    const hostname = window.location.hostname;
    const baseURL = hostname === 'localhost' || hostname === '127.0.0.1' 
      ? 'http://localhost:5001' 
      : `http://${hostname}:5001`;

    const socket = io(baseURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket.io bağlandı (Mutfak Ekranı)');
      // Mutfak room'una subscribe ol
      socket.emit('subscribe:kitchen', { branchId: 'default', station: '*' });
      console.log('📡 Mutfak room\'una katıldı');
    });

    // Debounce fonksiyonu
    const debouncedFetchOrders = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchOrders();
      }, 500);
    };

    // Yeni sipariş oluşturuldu
    socket.on('table:order:created', (data) => {
      console.log('📡 Yeni sipariş oluşturuldu:', data);
      debouncedFetchOrders();
    });

    // Global order:created event'i (garson siparişleri için)
    socket.on('order:created', (data) => {
      console.log('📡 Yeni sipariş oluşturuldu (global):', data);
      debouncedFetchOrders();
    });

    // Sipariş durumu değişti
    socket.on('order:status:changed', (data) => {
      console.log('📡 Sipariş durumu değişti:', data);
      // QR siparişlerinde optimisticItems'i korumak için fetchOrders çağrısını geciktir
      // Sadece sipariş tamamlandığında (tamamlandi) fetchOrders çağır
      if (data.to === 'tamamlandi' || data.to === 'PAID' || data.to === 'SERVED') {
        debouncedFetchOrders();
      } else {
        // Diğer durumlarda geciktir
        setTimeout(() => {
          debouncedFetchOrders();
        }, 2000); // 2 saniye bekle
      }
    });

    // Item durumu değişti

    socket.on('item:queued', (data) => {
      console.log('📡 Yeni ürün sıraya eklendi:', data);
      // QR siparişlerinde optimisticItems'i korumak için fetchOrders çağrısını geciktir
      // Sadece yeni siparişler için fetchOrders çağır, mevcut siparişlerdeki item güncellemeleri için değil
      setTimeout(() => {
        debouncedFetchOrders();
      }, 2000); // 2 saniye bekle
    });

    socket.on('item:started', (data) => {
      console.log('📡 Ürün hazırlanmaya başlandı:', data);
      // item:started event'i için fetchOrders çağrısını kaldırdık
      // Çünkü bu event sık tetikleniyor ve masa kartlarının hareket etmesine neden oluyor
      // Ayrıca optimisticItems'i override ediyor
      // fetchOrders() çağrısı yapmıyoruz, sadece yeni siparişler için gerekli
    });

    socket.on('item:ready', (data) => {
      console.log('📡 Ürün hazır:', data);
      // QR siparişlerinde backend'den gelen verilerde item status'u henüz READY olmayabilir
      // fetchOrders() çağrısını kaldırdık çünkü backend'den gelen veriler optimisticItems'i override ediyor
      // OptimisticItems zaten item'ı READY gösteriyor, backend senkronize olduğunda useEffect temizleyecek
      // QR siparişlerinde backend güncellemesi gecikebilir, bu yüzden optimisticItems'i koruyoruz
      // fetchOrders() çağrısı yapmıyoruz, sadece useEffect içinde backend'den gelen veriler kontrol edilecek
    });

    // Bağlantı hatası
    socket.on('connect_error', (error) => {
      console.error('❌ Socket.io bağlantı hatası:', error);
    });

    // Bağlantı kesildi
    socket.on('disconnect', () => {
      console.log('❌ Socket.io bağlantısı kesildi');
    });

    // Fallback: Her 10 saniyede bir polling (socket bağlantısı yoksa)
    const interval = setInterval(() => {
      if (!socket.connected) {
        console.log('⚠️ Socket bağlı değil, polling ile güncelleniyor...');
        fetchOrders();
      }
    }, 10000);

    // Cleanup
    return () => {
      clearInterval(interval);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // İstatistikleri hesapla
  const stats = useMemo(() => {
    const activeOrders = orders.filter(o => {
      const status = o.status || 'hazirlaniyor';
      return ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'hazirlaniyor', 'serviste'].includes(status);
    });
    
    const completedOrders = orders.filter(o => {
      const status = o.status || '';
      return ['tamamlandi', 'PAID', 'CANCELED', 'SERVED'].includes(status);
    });

    const pendingItems = activeOrders.reduce((sum, order) => {
      const items = order.orderItems || order.items || [];
      return sum + items.filter(item => {
        const itemStatus = item.status || 'QUEUED';
        return ['QUEUED', 'STARTED'].includes(itemStatus);
      }).length;
    }, 0);

    return {
      active: activeOrders.length,
      completed: completedOrders.length,
      pending: pendingItems
    };
  }, [orders]);

  // Siparişleri masa bazında grupla - tüm aktif siparişler gösterilecek
  const groupedOrders = useMemo(() => {
    // Tüm aktif siparişleri göster (filtreleme yok)
    const filtered = orders.filter(order => {
      const status = order.status || 'hazirlaniyor';
      // Sadece aktif siparişleri göster (tamamlanan ve iptal edilenleri gösterme)
      return ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'hazirlaniyor', 'serviste'].includes(status);
    });

    // Masa bazında grupla
    const grouped = {};
    filtered.forEach(order => {
      const tableName = order.table?.name || order.tableId?.name || order.tableNumber || '—';
      if (!grouped[tableName]) {
        grouped[tableName] = [];
      }
      grouped[tableName].push(order);
    });

    return grouped;
  }, [orders]);

  // Sipariş durumunu güncelle
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API}/api/kitchen/orders/${orderId}/status`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {} }
      );
      // Hemen fetchOrders çağır (debounce olmadan) - masa kartı hemen silinsin
      fetchOrders();
    } catch (e) {
      console.error('Sipariş durumu güncellenemedi:', e);
      setError(e.response?.data?.message || e.message || 'Güncelleme başarısız');
    }
  };

  // Ürün durumunu güncelle
  const updateItemStatus = async (orderId, itemId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      if (newStatus === 'READY') {
        await axios.post(
          `${API}/api/kitchen/items/${itemId}/ready`,
          {},
          { headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {} }
        );
      } else if (newStatus === 'STARTED') {
        await axios.post(
          `${API}/api/kitchen/items/${itemId}/start`,
          {},
          { headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {} }
        );
      }
      // Socket event'lerinden otomatik güncellenecek, bu yüzden fetchOrders çağrısını kaldırdık
      // Sadece socket bağlı değilse fallback olarak çağır
      if (!socketRef.current?.connected) {
        setTimeout(() => {
          fetchOrders();
        }, 100);
      }
    } catch (e) {
      console.error('Ürün durumu güncellenemedi:', e);
      setError(e.response?.data?.message || e.message || 'Güncelleme başarısız');
      // Hata durumunda fetchOrders çağır
      fetchOrders();
    }
  };

  // Tüm ürünleri hazır yap
  const markAllReady = async (order) => {
    try {
      const items = order.orderItems || order.items || [];
      const token = localStorage.getItem('token');
      
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const itemId = item._id 
          ? String(item._id) 
          : `${String(order._id)}-${idx}`;
        const currentStatus = item.status;
        
        // Eğer status yoksa veya READY/SERVED değilse, işle
        if (!currentStatus || (currentStatus !== 'READY' && currentStatus !== 'SERVED')) {
          // Eğer status yoksa veya QUEUED ise, önce STARTED yap
          if (!currentStatus || currentStatus === 'QUEUED') {
            try {
              await axios.post(
                `${API}/api/kitchen/items/${itemId}/start`,
                {},
                { headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {} }
              );
              // Kısa bir bekleme sonrası READY yap
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (startError) {
              console.warn('Item start hatası (devam ediliyor):', startError);
              // Hata olsa bile devam et, belki zaten STARTED durumunda
            }
          }
          // READY yap
          try {
            await axios.post(
              `${API}/api/kitchen/items/${itemId}/ready`,
              {},
              { headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {} }
            );
          } catch (readyError) {
            // Eğer item zaten READY ise, hata verme (idempotent)
            if (readyError.response?.status === 409 && readyError.response?.data?.message?.includes('READY')) {
              console.log('Item zaten READY durumunda, atlanıyor');
              continue; // Bu item'ı atla, diğerlerine devam et
            }
            console.error('Item ready hatası:', readyError);
            // Diğer hatalar için devam et, tüm item'ları işlemeye çalış
            if (readyError.response?.status === 409) {
              console.warn('Item durumu uygun değil, atlanıyor:', readyError.response?.data?.message);
              continue;
            }
            throw readyError;
          }
        }
      }
      
      // Tüm ürünler hazır olduktan sonra siparişi tamamlandı olarak işaretle
      await updateOrderStatus(order._id, 'tamamlandi');
      // Debounce ile fetchOrders çağrısını geciktir
      setTimeout(() => {
        fetchOrders();
      }, 500);
    } catch (e) {
      console.error('Tüm ürünler hazır yapılamadı:', e);
      setError(e.response?.data?.message || e.message || 'Güncelleme başarısız');
    }
  };

  // Sipariş durumunu al
  const getOrderStatus = (order) => {
    const status = order.status || 'hazirlaniyor';
    if (['CREATED', 'SENT_TO_KITCHEN', 'hazirlaniyor'].includes(status)) {
      return { label: 'YENİ', color: '#FF9800', bg: '#FFF3E0' };
    } else if (['IN_PREP', 'serviste'].includes(status)) {
      return { label: 'HAZIRLANIYOR', color: '#2196F3', bg: '#E3F2FD' };
    } else if (['READY', 'serviste'].includes(status)) {
      return { label: 'HAZIR', color: '#4CAF50', bg: '#E8F5E9' };
    }
    return { label: 'YENİ', color: '#FF9800', bg: '#FFF3E0' };
  };

  // Ürün durumunu al
  const getItemStatus = (item) => {
    const status = item.status || 'QUEUED';
    if (status === 'QUEUED') {
      return { label: 'Sırada', color: '#FF9800', bg: '#FFF3E0' };
    } else if (status === 'STARTED') {
      return { label: 'Hazırlanıyor', color: '#2196F3', bg: '#E3F2FD' };
    } else if (status === 'READY' || status === 'SERVED') {
      return { label: 'Hazır', color: '#4CAF50', bg: '#E8F5E9' };
    }
    return { label: 'Sırada', color: '#FF9800', bg: '#FFF3E0' };
  };

  // Timer hook - Geçen süreyi MM:SS formatında hesaplar ve toplam dakikayı döndürür
  const useOrderTimer = (createdAt, orderStatus, allItemsReady) => {
    const [timerData, setTimerData] = useState({ timeString: '00:00', totalMinutes: 0 });
    const [isStopped, setIsStopped] = useState(false);

    useEffect(() => {
      if (!createdAt) {
        setTimerData({ timeString: '00:00', totalMinutes: 0 });
        setIsStopped(false);
        return;
      }

      // Sipariş tamamlandıysa veya tüm ürünler hazırsa timer'ı durdur
      const completedStatuses = ['tamamlandi', 'PAID', 'SERVED', 'CANCELED'];
      const isOrderCompleted = orderStatus && completedStatuses.includes(orderStatus);
      const shouldStop = isOrderCompleted || (allItemsReady === true);
      
      if (shouldStop) {
        if (!isStopped) {
          setIsStopped(true);
          // Son değeri hesapla ve durdur
          const now = new Date();
          const created = new Date(createdAt);
          const diffMs = now - created;
          
          if (diffMs >= 0) {
            const totalSeconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedSeconds = String(seconds).padStart(2, '0');
            
            setTimerData({
              timeString: `${formattedMinutes}:${formattedSeconds}`,
              totalMinutes: minutes
            });
          }
        }
        // Timer'ı durdur, interval oluşturma
        return;
      }

      // Eğer durdurulmuşsa ve tekrar aktif olduysa, timer'ı yeniden başlat
      if (isStopped && !shouldStop) {
        setIsStopped(false);
      }

      // Eğer durdurulmuşsa, timer'ı güncelleme
      if (isStopped) {
        return;
      }

      const updateTimer = () => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffMs = now - created;
        
        if (diffMs < 0) {
          setTimerData({ timeString: '00:00', totalMinutes: 0 });
          return;
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        
        setTimerData({
          timeString: `${formattedMinutes}:${formattedSeconds}`,
          totalMinutes: minutes
        });
      };

      // İlk güncelleme
      updateTimer();

      // Her saniye güncelle
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }, [createdAt, orderStatus, allItemsReady, isStopped]);

    return timerData;
  };

  const OrderCard = ({ order }) => {
    const orderStatus = getOrderStatus(order);
    // Her item için loading state'i tut
    const [itemLoadingStates, setItemLoadingStates] = useState({});
    // Optimistic update için local state
    const [optimisticItems, setOptimisticItems] = useState(null);
    // Siparişin başlangıç durumunu sakla (hover efekti için)
    const [initialOrderStatus, setInitialOrderStatus] = useState(null);
    
    // Order değiştiğinde optimistic state'i sıfırla ve başlangıç durumunu sakla
    // NOT: Sadece order._id değiştiğinde temizle, order.items değiştiğinde temizleme
    useEffect(() => {
      // Sadece order._id değiştiğinde optimisticItems'i temizle
      // order.items değiştiğinde temizleme (backend güncellemesi için)
      setItemLoadingStates({});
      // Siparişin başlangıç durumunu sakla (sadece ilk yüklemede)
      if (initialOrderStatus === null) {
        const status = getOrderStatus(order);
        setInitialOrderStatus(status.label === 'YENİ');
      }
    }, [order._id]);
    
    // QR siparişlerinde optimisticItems'i KORU - backend'den gelen veriler item status'u içermeyebilir
    // Sadece sipariş tamamen tamamlandığında (tamamlandi, PAID, SERVED) temizle
    useEffect(() => {
      if (optimisticItems) {
        const orderStatus = order.status || '';
        const completedStatuses = ['tamamlandi', 'PAID', 'SERVED', 'CANCELED', 'iptal'];
        
        // Sipariş tamamen tamamlandıysa optimisticItems'i temizle
        if (completedStatuses.includes(orderStatus)) {
          setOptimisticItems(null);
        }
        // QR siparişlerinde backend'den gelen veriler item status'u içermeyebilir
        // Bu yüzden optimisticItems'i koru, sadece sipariş tamamlandığında temizle
      }
    }, [order.status]); // Sadece order.status değiştiğinde kontrol et
    
    // Hem orderItems hem items field'larını kontrol et
    let items = [];
    if (order.orderItems && Array.isArray(order.orderItems) && order.orderItems.length > 0) {
      items = order.orderItems;
    } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      items = order.items;
    }
    
    // Optimistic update varsa onu kullan
    if (optimisticItems) {
      items = optimisticItems;
    }
    
    // Debug: Eğer items boşsa logla
    if (items.length === 0) {
      console.warn('⚠️ Siparişte ürün bulunamadı:', {
        orderId: order._id,
        hasOrderItems: !!order.orderItems,
        orderItemsLength: order.orderItems?.length || 0,
        hasItems: !!order.items,
        itemsLength: order.items?.length || 0,
        order: order
      });
    }
    
    const tableName = order.table?.name || order.tableId?.name || order.tableNumber || '—';
    const notes = order.notes || '';
    // QR siparişleri için items array'inde status olmayabilir, bu durumda kontrol et
    const allItemsReady = items.length > 0 && items.every(item => {
      // Eğer status yoksa, READY değil demektir
      if (!item.status) {
        return false;
      }
      const status = item.status;
      return status === 'READY' || status === 'SERVED';
    });
    
    // Timer için createdAt, order status ve allItemsReady kullan (tamamlandıysa veya tüm ürünler hazırsa durur)
    const timerData = useOrderTimer(order.createdAt, order.status, allItemsReady);
    const { timeString: elapsedTime, totalMinutes } = timerData;
    
    // 20 dakikadan fazla bekleyen siparişler için uyarı
    const isDelayed = totalMinutes >= 20;
    
    // Sipariş kaynağını belirle (QR veya Garson)
    const orderSource = (order.waiterId || order.waiter) ? 'garson' : 'qr';
    
    // Item durumunu güncelle (optimistic update)
    const handleItemReady = async (itemId, itemIndex, currentStatus) => {
      // Butonu hemen disabled yap
      setItemLoadingStates(prev => ({ ...prev, [itemId]: true }));
      
      try {
        // QR siparişlerinde status undefined olabilir, bu durumda QUEUED olarak kabul et
        const status = currentStatus || 'QUEUED';
        
        // Mevcut items array'ini al - order'dan direkt al (closure sorununu önlemek için)
        let baseItems = [];
        if (order.orderItems && Array.isArray(order.orderItems) && order.orderItems.length > 0) {
          baseItems = order.orderItems;
        } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          baseItems = order.items;
        }
        
        // Functional update kullan - her zaman en güncel state'i al
        let itemCurrentStatusForBackend = status; // Backend çağrıları için sakla
        setOptimisticItems(prevOptimisticItems => {
          // OptimisticItems varsa onu kullan, yoksa baseItems'ı kullan
          const currentItems = prevOptimisticItems || baseItems;
          
          // Item'ın mevcut status'unu kontrol et (functional update içinde, güncel state'ten)
          const currentItem = currentItems[itemIndex];
          const itemCurrentStatus = currentItem?.status || 'QUEUED';
          itemCurrentStatusForBackend = itemCurrentStatus; // Dışarıda kullanmak için sakla
          
          // Eğer item zaten READY veya SERVED ise, değişiklik yapma
          if (itemCurrentStatus === 'READY' || itemCurrentStatus === 'SERVED') {
            return prevOptimisticItems || baseItems;
          }
          
          // Optimistic update - hemen UI'da güncelle
          if (itemCurrentStatus === 'QUEUED' || itemCurrentStatus === undefined || itemCurrentStatus === null || itemCurrentStatus === '') {
            // READY için optimistic update - direkt READY yap (STARTED'ı atla)
            const readyItems = currentItems.map((item, idx) => {
              if (idx === itemIndex) {
                return { ...item, status: 'READY' };
              }
              return item;
            });
            return readyItems;
          } else if (itemCurrentStatus === 'STARTED') {
            // READY için optimistic update
            const readyItems = currentItems.map((item, idx) => {
              if (idx === itemIndex) {
                return { ...item, status: 'READY' };
              }
              return item;
            });
            return readyItems;
          }
          
          // Durum değişmediyse mevcut state'i döndür
          return prevOptimisticItems || baseItems;
        });
        
        // Loading state'i hemen kaldır (optimistic update yapıldı)
        setItemLoadingStates(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
        
        // Backend çağrılarını arka planda yap (await etmeden) - güncel status'u kullan
        // QR siparişlerinde item ID formatı orderId-index şeklinde ve backend'de /start endpoint'i bu formatı handle edemiyor
        // Bu yüzden QR siparişlerinde STARTED çağrısını atla, direkt READY çağrısı yap
        const backendStatus = status; // Closure'dan gelen status'u kullan
        if (orderSource === 'qr') {
          // QR siparişlerinde direkt READY çağrısı yap, STARTED'ı atla
          updateItemStatus(order._id, itemId, 'READY').catch(err => {
            console.warn('QR siparişi READY hatası (arka plan):', err);
            // QR siparişlerinde hata olsa bile optimisticItems'i koru, backend güncellemesi gecikebilir
          });
        } else {
          // Garson siparişlerinde normal akış: STARTED -> READY
          if (backendStatus === 'QUEUED' || backendStatus === undefined || backendStatus === null || backendStatus === '') {
            // Önce STARTED, sonra READY
            Promise.all([
              updateItemStatus(order._id, itemId, 'STARTED').catch(err => console.warn('STARTED hatası:', err)),
              updateItemStatus(order._id, itemId, 'READY').catch(err => console.warn('READY hatası:', err))
            ]).catch(err => {
              console.error('Backend güncelleme hatası:', err);
              // Hata durumunda optimistic update'i geri al
              setOptimisticItems(null);
              fetchOrders();
            });
          } else if (backendStatus === 'STARTED') {
            // Sadece READY
            updateItemStatus(order._id, itemId, 'READY').catch(err => {
              console.error('Backend güncelleme hatası:', err);
              // Hata durumunda optimistic update'i geri al
              setOptimisticItems(null);
              fetchOrders();
            });
          }
        }
        
        // Socket event'lerinden otomatik güncellenecek
        // QR siparişlerinde backend güncellemesi biraz gecikebilir, bu yüzden optimisticItems'i daha uzun süre tut
        // fetchOrders() çağrısını kaldırdık çünkü socket event'leri zaten güncellemeleri sağlıyor
        // fetchOrders() çağrısı optimisticItems'i override ediyor ve item'ın yeşil kalmasını engelliyor
        // useEffect'te backend'den gelen veriler kontrol edilecek ve eğer READY ise optimisticItems temizlenecek
        
        // OptimisticItems'i sadece backend'den gelen veriler READY olduğunda temizle
        // useEffect içinde kontrol edilecek, bu yüzden burada timeout ile temizlemeye gerek yok
      } catch (error) {
        console.error('❌ Item ready hatası:', error);
        // Hata durumunda optimistic update'i geri al
        setOptimisticItems(null);
        fetchOrders();
        // Loading state'i kaldır
        setItemLoadingStates(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
      }
    };

    // Siparişin yeni olup olmadığını kontrol et (hover efekti için)
    // Başlangıç durumunu kullan, eğer yoksa mevcut duruma bak
    const isNewOrder = initialOrderStatus !== null ? initialOrderStatus : (orderStatus.label === 'YENİ');
    
    return (
      <Card 
        className={`kitchen-order-card ${isNewOrder ? 'new-order' : ''} ${isDelayed ? 'delayed-order' : ''}`}
          sx={{ 
            border: isDelayed ? '3px solid #F44336' : '1px solid #E0E0E0',
            borderRadius: 0.5,
            mb: 0,
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'auto',
            '&:hover': {
              border: isDelayed ? '3px solid #F44336' : '2px solid #FF9800 !important',
              boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
            }
          }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 1.5, overflow: 'auto', position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5} sx={{ flexShrink: 0, position: 'relative', zIndex: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', position: 'relative', zIndex: 3 }}>
                Masa {tableName}
              </Typography>
              {orderSource === 'qr' ? (
                <QrCodeIcon sx={{ fontSize: '1rem', color: '#666' }} />
              ) : (
                <PersonIcon sx={{ fontSize: '1rem', color: '#666' }} />
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ position: 'relative', zIndex: 3 }}>
              <Box
                sx={{
                  bgcolor: '#42A5F5 ',
                  color: 'white',
                  fontWeight: 700,
                  minWidth: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 0.5,
                  fontSize: '0.875rem'
                }}
              >
                {items.length}
              </Box>
              <Box
                sx={{
                  bgcolor: isDelayed ? '#FFEBEE' : '#E0E0E0',  // Gecikmiş: kırmızı, Normal: gri
                  color: isDelayed ? '#F44336' : '#FFC107',     // Gecikmiş: kırmızı, Normal: sarı
                  fontWeight: 700,
                  height: '24px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 1.5,
                  borderRadius: 0.5,
                  minWidth: '50px'
                }}
              >
                {elapsedTime}
              </Box>
            </Stack>
          </Stack>

          {/* Ayırıcı Çizgi */}
          <Divider sx={{ mb: 1.5, borderColor: '#E0E0E0', flexShrink: 0 }} />

          {/* Items */}
          <Stack 
            spacing={1} 
            mb={1.5} 
            sx={{ 
              flex: 1, 
              overflowY: 'auto',
              overflowX: 'hidden',
              maxHeight: items.length > 4 ? '280px' : 'none',
              pr: 0.5,
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '10px',
                '&:hover': {
                  background: '#555',
                },
              },
            }}
          >
            {items.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2 }}>
                Bu siparişte ürün bulunmamaktadır.
              </Typography>
            )}
            {items.map((item, idx) => {
              const itemStatus = getItemStatus(item);
              // Item ID'yi belirle: QR siparişlerinde her zaman orderId-index formatını kullan
              // Çünkü backend'de item._id ile bulunamayabilir
              // Garson siparişlerinde item._id varsa onu kullan
              const itemId = (orderSource === 'qr' || !item._id)
                ? `${String(order._id)}-${idx}`
                : String(item._id);
              
              // items array'i zaten optimisticItems kullanıyor (satır 538-540)
              // O yüzden item.status zaten güncel optimistic status'u içeriyor
              // Direkt item.status'u kullan, ekstra kontrol yapma
              const itemStatusValue = item.status || 'QUEUED';
              const isItemReady = itemStatusValue === 'READY' || itemStatusValue === 'SERVED';
              
              return (
                <Box 
                  key={`${order._id}-${itemId}-${idx}`}
                  sx={{ 
                    p: 1, 
                    borderRadius: 1,
                    bgcolor: 'transparent',
                    border: 'none',
                    mb: 1
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    {/* Sol taraf - Ürün bilgisi */}
                    <Stack direction="row" spacing={0.5} alignItems="center" flex={1} sx={{ minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={700} sx={{ color: '#000', whiteSpace: 'nowrap' }}>
                        {item.qty || 1}x
                      </Typography>
                      <Typography 
                        variant="body1" 
                        className={isItemReady ? 'kitchen-item-ready' : ''}
                        sx={{ 
                          color: isItemReady ? '#666' : '#666', 
                          fontWeight: 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          ...(isItemReady ? {
                            textDecoration: 'line-through !important',
                            textDecorationLine: 'line-through !important',
                            textDecorationColor: '#666 !important',
                            textDecorationStyle: 'solid !important',
                            opacity: 0.7,
                            color: '#666 !important'
                          } : {
                            textDecoration: 'none',
                            textDecorationLine: 'none'
                          })
                        }}
                        style={{
                          textDecoration: isItemReady ? 'line-through' : 'none',
                          textDecorationLine: isItemReady ? 'line-through' : 'none',
                          textDecorationColor: isItemReady ? '#666' : 'transparent'
                        }}
                      >
                        {item.name || 
                          item.productName || 
                          item.product?.name || 
                          item.menuItem?.name || 
                          'Ürün'}
                      </Typography>
                    </Stack>
                    {/* Sağ taraf - Hazır butonu */}
                    <Button
                      variant={isItemReady ? "outlined" : "contained"}
                      color={isItemReady ? "default" : "success"}
                      size="medium"
                      disabled={isItemReady || itemLoadingStates[itemId]}
                      onClick={() => {
                        if (!isItemReady && !itemLoadingStates[itemId]) {
                          const currentStatus = itemStatusValue;
                          handleItemReady(itemId, idx, currentStatus);
                        }
                      }}
                      sx={{ 
                        minWidth: '90px',
                        textTransform: 'none',
                        borderRadius: 1,
                        bgcolor: isItemReady ? 'transparent' : '#4CAF50',
                        color: isItemReady ? '#666' : '#FFFFFF',
                        borderColor: isItemReady ? '#E0E0E0' : '#4CAF50',
                        fontWeight: 600,
                        opacity: itemLoadingStates[itemId] ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isItemReady ? '#F5F5F5' : '#45a049',
                          borderColor: isItemReady ? '#E0E0E0' : '#45a049',
                        },
                        '&:disabled': {
                          bgcolor: isItemReady ? 'transparent' : '#4CAF50',
                          color: isItemReady ? '#666' : '#FFFFFF',
                          opacity: isItemReady ? 1 : 0.6,
                        }
                      }}
                    >
                      {itemLoadingStates[itemId] ? '...' : 'Hazır'}
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>

          {/* Notes */}
          {notes && (
            <>
              <Divider sx={{ my: 2, borderColor: '#E0E0E0' }} />
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon sx={{ fontSize: 18, color: '#666', flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                  {notes}
                </Typography>
              </Box>
            </>
          )}

          {/* Action Button - Alt kısma sabitlenmiş */}
          <Box sx={{ mt: 'auto', pt: 1.5, flexShrink: 0 }}>
            <Button
              variant="contained"
              color={allItemsReady ? "success" : "primary"}
              fullWidth
              startIcon={allItemsReady ? <CheckCircleIcon /> : null}
              onClick={async () => {
                if (allItemsReady) {
                  await updateOrderStatus(order._id, 'tamamlandi');
                } else {
                  await markAllReady(order);
                }
              }}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 600,
                bgcolor: allItemsReady ? '#4CAF50' : '#212121',
                color: '#FFFFFF',
                '&:hover': {
                  bgcolor: allItemsReady ? '#45a049' : '#424242',
                }
              }}
            >
              {allItemsReady ? 'Teslim Edildi' : 'Tümünü Hazır Yap'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100%', 
      position: 'relative',
      margin: 0,
      padding: 0,
      '& > *': {
        marginLeft: 0,
        marginRight: 0
      }
    }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2, mx: 3, mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Sipariş Kartları */}
      {Object.keys(groupedOrders).length === 0 && !loading ? (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: 'calc(100vh - 200px)',
            mt: 6
          }}
        >
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
            Aktif siparişiniz yok
          </Typography>
        </Box>
      ) : (
        <Box className="kitchen-items-grid" sx={{ px: { xs: 2, sm: 2, md: 3 }, mt: 6, pt: 2 }}>
          {Object.entries(groupedOrders).map(([tableName, tableOrders]) => 
            tableOrders.map((order) => (
              <OrderCard key={order._id || order.id} order={order} />
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
