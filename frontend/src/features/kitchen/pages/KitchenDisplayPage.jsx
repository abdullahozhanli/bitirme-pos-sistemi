import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { createAuthenticatedSocket, getStaffSocketToken } from '../../../shared/utils/socketClient';
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
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NoteIcon from '@mui/icons-material/Note';
import DescriptionIcon from '@mui/icons-material/Description';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PersonIcon from '@mui/icons-material/Person';
import './KitchenDisplayPage.css';

const API = import.meta?.env?.VITE_API_URL || 'http://localhost:5001';

export default function KitchenDisplayPage() {
  const { user } = useAuth?.() || { user: null };
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
    
    // Kullanıcının branchId'sini al
    const currentBranchId = user?.branchId || user?.branch?._id || 'default';
    
    // Socket.io bağlantısı
    const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';

    const token = getStaffSocketToken();
    if (!token) return undefined;

    const socket = createAuthenticatedSocket(baseURL, token);
    if (!socket) return undefined;

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket.io bağlandı (Mutfak Ekranı)');
      // Mutfak room'una subscribe ol - kullanıcının branchId'sini kullan
      socket.emit('subscribe:kitchen', { branchId: currentBranchId, station: '*' });
      console.log(`📡 Mutfak room'una katıldı: kitchen.${currentBranchId}`);
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
  }, [user]);

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
    
    // YENİ: Toplu işlem loading durumu
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    
    // Order değiştiğinde optimistic state'i sıfırla ve başlangıç durumunu sakla
    useEffect(() => {
      setItemLoadingStates({});
      if (initialOrderStatus === null) {
        const status = getOrderStatus(order);
        setInitialOrderStatus(status.label === 'YENİ');
      }
    }, [order._id]);
    
    // QR siparişlerinde optimisticItems'i KORU
    useEffect(() => {
      if (optimisticItems) {
        const orderStatus = order.status || '';
        const completedStatuses = ['tamamlandi', 'PAID', 'SERVED', 'CANCELED', 'iptal'];
        if (completedStatuses.includes(orderStatus)) {
          setOptimisticItems(null);
        }
      }
    }, [order.status]);
    
    // Hem orderItems hem items field'larını kontrol et
    let items = [];
    if (order.orderItems && Array.isArray(order.orderItems) && order.orderItems.length > 0) {
      items = order.orderItems;
    } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      items = order.items;
    }
    
    if (optimisticItems) {
      items = optimisticItems;
    }
    
    // Debug
    if (items.length === 0) {
      console.warn('⚠️ Siparişte ürün bulunamadı:', { orderId: order._id });
    }
    
    const tableName = order.table?.name || order.tableId?.name || order.tableNumber || '—';
    const notes = order.notes || '';
    
    const allItemsReady = items.length > 0 && items.every(item => {
      if (!item.status) return false;
      const status = item.status;
      return status === 'READY' || status === 'SERVED';
    });
    
    const timerData = useOrderTimer(order.createdAt, order.status, allItemsReady);
    const { timeString: elapsedTime, totalMinutes } = timerData;
    const isDelayed = totalMinutes >= 20;
    const orderSource = (order.waiterId || order.waiter) ? 'garson' : 'qr';
    
    // Tekli Item durumunu güncelle
    const handleItemReady = async (itemId, itemIndex, currentStatus) => {
      setItemLoadingStates(prev => ({ ...prev, [itemId]: true }));
      
      try {
        const status = currentStatus || 'QUEUED';
        
        let baseItems = [];
        if (order.orderItems?.length > 0) baseItems = order.orderItems;
        else if (order.items?.length > 0) baseItems = order.items;
        
        setOptimisticItems(prevOptimisticItems => {
          const currentItems = prevOptimisticItems || baseItems;
          const currentItem = currentItems[itemIndex];
          const itemCurrentStatus = currentItem?.status || 'QUEUED';
          
          if (itemCurrentStatus === 'READY' || itemCurrentStatus === 'SERVED') {
            return prevOptimisticItems || baseItems;
          }
          
          const readyItems = currentItems.map((item, idx) => {
            if (idx === itemIndex) return { ...item, status: 'READY' };
            return item;
          });
          return readyItems;
        });
        
        setItemLoadingStates(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
        
        const backendStatus = status;
        if (orderSource === 'qr') {
          updateItemStatus(order._id, itemId, 'READY').catch(err => {
            console.warn('QR siparişi READY hatası:', err);
          });
        } else {
          if (backendStatus === 'QUEUED' || !backendStatus) {
            Promise.all([
              updateItemStatus(order._id, itemId, 'STARTED').catch(console.warn),
              updateItemStatus(order._id, itemId, 'READY').catch(console.warn)
            ]).catch(() => {
              setOptimisticItems(null);
              fetchOrders();
            });
          } else if (backendStatus === 'STARTED') {
            updateItemStatus(order._id, itemId, 'READY').catch(() => {
              setOptimisticItems(null);
              fetchOrders();
            });
          }
        }
      } catch (error) {
        console.error('❌ Item ready hatası:', error);
        setOptimisticItems(null);
        fetchOrders();
        setItemLoadingStates(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
      }
    };

    // 🔥 YENİ: Optimize Edilmiş Hızlı Toplu Güncelleme
    const handleOptimizedMarkAllReady = async () => {
        if (isMarkingAll) return; // Çift tıklamayı önle
        setIsMarkingAll(true);

        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

            // 1. Optimistic Update: Kullanıcıya anında yeşil göster
            const updatedItems = items.map(item => ({ ...item, status: 'READY' }));
            setOptimisticItems(updatedItems);

            // 2. Paralel İstekler: Tüm ürünler için istekleri hazırla
            const promises = items.map(item => {
                const currentStatus = item.status || 'QUEUED';
                // Zaten hazırsa işlem yapma
                if (currentStatus === 'READY' || currentStatus === 'SERVED') return Promise.resolve();

                const itemId = (orderSource === 'qr' || !item._id) 
                    ? `${String(order._id)}-${items.indexOf(item)}` 
                    : String(item._id);

                // QR siparişleri için direkt READY
                if (orderSource === 'qr') {
                    return axios.post(`${API}/api/kitchen/items/${itemId}/ready`, {}, { headers });
                }

                // Garson siparişleri için (Queued ise Start -> Ready zinciri)
                if (currentStatus === 'QUEUED' || !currentStatus) {
                    return axios.post(`${API}/api/kitchen/items/${itemId}/start`, {}, { headers })
                        .then(() => axios.post(`${API}/api/kitchen/items/${itemId}/ready`, {}, { headers }))
                        .catch(() => axios.post(`${API}/api/kitchen/items/${itemId}/ready`, {}, { headers })); // Start hata verirse yine de Ready dene
                } else {
                    return axios.post(`${API}/api/kitchen/items/${itemId}/ready`, {}, { headers });
                }
            });

            // 3. Hepsini aynı anda gönder (Sırayla bekleme yok!)
            await Promise.all(promises);

            // 4. Siparişi tamamla
            await updateOrderStatus(order._id, 'tamamlandi');

        } catch (err) {
            console.error('Toplu güncelleme hatası:', err);
            // Hata olursa optimistic update'i geri al
            setOptimisticItems(null);
            fetchOrders();
        } finally {
            setIsMarkingAll(false);
        }
    };

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
              <Box sx={{ bgcolor: '#42A5F5 ', color: 'white', fontWeight: 700, minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0.5, fontSize: '0.875rem' }}>
                {items.length}
              </Box>
              <Box sx={{ bgcolor: isDelayed ? '#FFEBEE' : '#E0E0E0', color: isDelayed ? '#F44336' : '#FFC107', fontWeight: 700, height: '24px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1.5, borderRadius: 0.5, minWidth: '50px' }}>
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
              '&::-webkit-scrollbar': { width: '6px' },
              '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '10px' },
              '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: '10px', '&:hover': { background: '#555' } }
            }}
          >
            {items.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2 }}>
                Bu siparişte ürün bulunmamaktadır.
              </Typography>
            )}
            {items.map((item, idx) => {
              const itemId = (orderSource === 'qr' || !item._id) ? `${String(order._id)}-${idx}` : String(item._id);
              const itemStatusValue = item.status || 'QUEUED';
              const isItemReady = itemStatusValue === 'READY' || itemStatusValue === 'SERVED';
              
              return (
                <Box key={`${order._id}-${itemId}-${idx}`} sx={{ p: 1, borderRadius: 1, bgcolor: 'transparent', border: 'none', mb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Stack direction="row" spacing={0.5} alignItems="center" flex={1} sx={{ minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={700} sx={{ color: '#111827', whiteSpace: 'nowrap' }}>
                        {item.qty || 1}x
                      </Typography>
                      <Typography variant="body1" className={isItemReady ? 'kitchen-item-ready' : ''} sx={{ color: isItemReady ? '#666' : '#666', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isItemReady ? 'line-through' : 'none', opacity: isItemReady ? 0.7 : 1 }}>
                        {item.name || item.productName || item.product?.name || item.menuItem?.name || 'Ürün'}
                      </Typography>
                    </Stack>
                    <Button
                      variant={isItemReady ? "outlined" : "contained"}
                      color={isItemReady ? "default" : "success"}
                      size="medium"
                      disabled={isItemReady || itemLoadingStates[itemId] || isMarkingAll}
                      onClick={() => {
                        if (!isItemReady && !itemLoadingStates[itemId]) {
                          handleItemReady(itemId, idx, itemStatusValue);
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
                        opacity: (itemLoadingStates[itemId] || isMarkingAll) ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: isItemReady ? '#F5F5F5' : '#45a049', borderColor: isItemReady ? '#E0E0E0' : '#45a049' }
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

          {/* Action Button - GÜNCELLENEN KISIM */}
          <Box sx={{ mt: 'auto', pt: 1.5, flexShrink: 0 }}>
            <Button
              variant="contained"
              color={allItemsReady ? "success" : "primary"}
              fullWidth
              startIcon={allItemsReady ? <CheckCircleIcon /> : null}
              disabled={isMarkingAll} // İşlem bitene kadar butonu pasif yap
              onClick={async () => {
                if (allItemsReady) {
                  await updateOrderStatus(order._id, 'tamamlandi');
                } else {
                  await handleOptimizedMarkAllReady(); // Yeni hızlı fonksiyonu çağır
                }
              }}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 600,
                bgcolor: allItemsReady ? '#4CAF50' : '#212121',
                color: '#FFFFFF',
                opacity: isMarkingAll ? 0.7 : 1,
                '&:hover': {
                  bgcolor: allItemsReady ? '#45a049' : '#424242',
                }
              }}
            >
              {isMarkingAll 
                ? 'İşleniyor...' 
                : (allItemsReady ? 'Teslim Edildi' : 'Tümünü Hazır Yap')
              }
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
          {Object.entries(groupedOrders).map(([, tableOrders]) =>
            tableOrders.map((order) => (
              <OrderCard key={order._id || order.id} order={order} />
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
