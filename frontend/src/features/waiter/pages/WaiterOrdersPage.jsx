import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Card,
  CardContent,
  Divider,
  IconButton,
  Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StatusChip from '../../../shared/components/ui/StatusChip.jsx';
import OrderDetailModal from '../../../shared/components/modals/OrderDetailModal.jsx';
import './WaiterOrdersPage.css';

export default function WaiterOrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const socketRef = useRef(null);

  // URL parametrelerinden filtreleri al
  const tableId = searchParams.get('tableId');
  const orderId = searchParams.get('orderId');
  const statusParam = searchParams.get('status');
  useEffect(() => {
    // URL'den gelen status parametresini filtreye uygula
    if (statusParam) {
      const statuses = statusParam.split(',');
      setStatusFilter(statuses[0] || '');
    }
  }, [statusParam]);

  // Siparişleri çek
  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const params = { limit: 100 };
      if (tableId) params.tableId = tableId;
      if (statusParam) {
        const statuses = statusParam.split(',');
        params.status = statuses[0];
      }

      const response = await axios.get('/api/waiter/orders', { headers, params });
      const ordersList = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      
      // Eğer orderId varsa, o siparişi seç
      if (orderId) {
        const order = ordersList.find(o => String(o._id || o.id) === String(orderId));
        if (order) {
          setSelectedOrder(order);
          setDetailModalOpen(true);
        }
      }

      setOrders(ordersList);
      setFilteredOrders(ordersList);
    } catch (err) {
      console.error('Siparişler yüklenemedi:', err);
      setError(err.response?.data?.message || err.message || 'Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [tableId, orderId, statusParam]);

  // Socket.io bağlantısı ve bildirimler
  useEffect(() => {
    const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';

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
      console.log('✅ Socket.io bağlandı (Garson Siparişler)');
      
      // Garson odasına abone ol (bildirimler için)
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.id || payload._id;
          if (userId) {
            socket.emit('subscribe:waiter', { waiterId: userId });
            console.log('✅ Garson odasına abone olundu:', userId);
          }
        } catch (e) {
          console.warn('⚠️ Token decode edilemedi:', e);
        }
      }
    });

    // Yeni sipariş oluşturuldu bildirimi
    socket.on('order:created', (data) => {
      console.log('📡 Yeni sipariş oluşturuldu:', data);
      // Siparişleri yenile
      fetchOrders();
    });

    // Ürün hazır bildirimi (mutfaktan)
    socket.on('item:ready', (data) => {
      console.log('📡 Ürün hazır bildirimi:', data);
      const tableName = data.table?.name || data.tableNumber || data.order?.tableId?.name || 'Bilinmeyen';
      const itemName = data.order?.orderItems?.[0]?.name || data.productName || 'Ürün';
      
      setSnack({ 
        open: true, 
        message: `✅ ${tableName} masası - ${itemName} hazır!`, 
        severity: 'success' 
      });
      
      // Siparişleri yenile
      fetchOrders();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Filtreleme
  useEffect(() => {
    let filtered = [...orders];

    // Durum filtresi
    if (statusFilter) {
      filtered = filtered.filter(order => {
        const status = order.status || '';
        if (statusParam && statusParam.includes(',')) {
          const statuses = statusParam.split(',');
          return statuses.includes(status);
        }
        return status === statusFilter;
      });
    }

    // Arama filtresi
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        const orderId = String(order._id || order.id || '').toLowerCase();
        const tableName = (order.tableId?.name || order.table?.name || '').toLowerCase();
        return orderId.includes(search) || tableName.includes(search);
      });
    }

    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchTerm, statusParam]);

  // Sipariş detayını aç
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  // Sipariş kalemini servis et
  const handleServeItem = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      await axios.post(`/api/waiter/items/${itemId}/served`, {}, { headers });
      setSnack({ open: true, message: 'Sipariş kalemi servis edildi', severity: 'success' });
      fetchOrders();
    } catch (err) {
      console.error('Servis hatası:', err);
      setSnack({ open: true, message: err.response?.data?.message || 'Servis edilemedi', severity: 'error' });
    }
  };

  // Ödeme al
  const handlePayment = async (order) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      await axios.post('/api/waiter/payments', {
        orderId: order._id || order.id,
        method: 'cash',
        amount: order.totalPrice || order.total || 0,
      }, { headers });
      
      setSnack({ open: true, message: 'Ödeme alındı', severity: 'success' });
      fetchOrders();
      setDetailModalOpen(false);
    } catch (err) {
      console.error('Ödeme hatası:', err);
      setSnack({ open: true, message: err.response?.data?.message || 'Ödeme alınamadı', severity: 'error' });
    }
  };

  // Özet istatistikler
  const stats = {
    total: orders.length,
    ready: orders.filter(o => ['READY', 'Hazır', 'hazir', 'tamamlandi'].includes(o.status)).length,
    pending: orders.filter(o => ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'hazirlaniyor'].includes(o.status)).length,
    served: orders.filter(o => ['SERVED', 'serviste'].includes(o.status)).length,
  };

  if (loading && orders.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/waiter')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              Sipariş Yönetimi
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tableId ? 'Masa siparişleri' : 'Tüm siparişler'}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          onClick={fetchOrders}
          disabled={loading}
        >
          Yenile
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Özet İstatistikler */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip
          icon={<ReceiptIcon />}
          label={`Toplam: ${stats.total}`}
          color="default"
          variant="outlined"
        />
        <Chip
          label={`Hazır: ${stats.ready}`}
          color="success"
          variant="outlined"
        />
        <Chip
          label={`Bekleyen: ${stats.pending}`}
          color="warning"
          variant="outlined"
        />
        <Chip
          label={`Serviste: ${stats.served}`}
          color="info"
          variant="outlined"
        />
      </Box>

      {/* Filtreleme */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder="Sipariş ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel>Durum</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Durum"
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="CREATED">Oluşturuldu</MenuItem>
              <MenuItem value="SENT_TO_KITCHEN">Mutfakta</MenuItem>
              <MenuItem value="IN_PREP">Hazırlanıyor</MenuItem>
              <MenuItem value="READY">Hazır</MenuItem>
              <MenuItem value="SERVED">Serviste</MenuItem>
              <MenuItem value="PAID">Ödendi</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Sipariş Listesi */}
      {filteredOrders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ReceiptIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3, color: 'text.secondary' }} />
          <Typography variant="body1" color="text.secondary">
            {searchTerm || statusFilter
              ? 'Arama kriterlerinize uygun sipariş bulunamadı.'
              : 'Henüz sipariş bulunmuyor.'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {filteredOrders.map((order) => {
            const orderId = order._id || order.id;
            const orderNumber = orderId ? `SIP-${orderId.toString().substring(0, 8).toUpperCase()}` : 'N/A';
            const table = order.tableId || order.table;
            const tableName = typeof table === 'object' ? table?.name : table || 'N/A';
            // orderItems veya items kontrolü - backend'den orderItems geliyor
            const items = order.orderItems || order.items || [];
            // Toplam ürün sayısını hesapla (qty'leri topla)
            const totalItemsCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
            const total = order.totalPrice || order.total || 0;
            const isReady = ['READY', 'Hazır', 'hazir', 'tamamlandi'].includes(order.status);
            const isServed = ['SERVED', 'serviste'].includes(order.status);
            const isPaid = order.status === 'PAID';

            return (
              <Card
                key={orderId}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 4,
                  },
                  border: isReady ? '2px solid' : '1px solid',
                  borderColor: isReady ? 'success.main' : 'divider',
                }}
                onClick={() => handleViewDetails(order)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {orderNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Masa: {tableName} • {totalItemsCount} ürün
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusChip status={order.status} />
                      {isReady && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Hazır"
                          color="success"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      ₺{total.toFixed(2)}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(order);
                        }}
                      >
                        Detay
                      </Button>
                      {isReady && !isServed && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Tüm hazır kalemleri servis et (READY veya status yoksa - eski siparişler için)
                            const readyItems = items.filter(item => {
                              // Eğer item'da status yoksa ve sipariş tamamlandi durumundaysa, tüm item'ları servis et
                              if (order.status === 'tamamlandi' && !item.status) {
                                return true;
                              }
                              return item.status === 'READY' || item.status === 'SERVED';
                            });
                            readyItems.forEach(item => {
                              if (item._id) handleServeItem(item._id);
                            });
                          }}
                        >
                          Servis Et
                        </Button>
                      )}
                      {isServed && !isPaid && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<PaymentIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePayment(order);
                          }}
                        >
                          Ödeme Al
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Detay Modal */}
      <OrderDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onMakeReady={() => {
          fetchOrders();
        }}
        onMarkPaid={() => {
          if (selectedOrder) handlePayment(selectedOrder);
        }}
        onCancelOrder={async (orderId) => {
          if (!orderId) return;
          try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
            await axios.post(`/api/waiter/orders/${orderId}/cancel`, { reason: 'Garson iptali' }, { headers });
            setSnack({ open: true, message: 'Sipariş iptal edildi', severity: 'success' });
            setDetailModalOpen(false);
            setSelectedOrder(null);
            fetchOrders();
          } catch (err) {
            setSnack({
              open: true,
              message: err.response?.data?.message || 'İptal edilemedi',
              severity: 'error',
            });
          }
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbar-root': {
            animation: 'slideInFromTop 0.3s ease-out',
          }
        }}
      >
        <Alert
          elevation={3}
          severity={snack.severity}
          onClose={() => setSnack({ ...snack, open: false })}
          sx={{ 
            width: '100%',
            animation: snack.severity === 'success' ? 'pulseNotification 2s ease-in-out infinite' : 'none',
            boxShadow: snack.severity === 'success' ? '0 4px 12px rgba(76, 175, 80, 0.4)' : 'none',
            fontSize: '1rem',
            fontWeight: 600,
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}







