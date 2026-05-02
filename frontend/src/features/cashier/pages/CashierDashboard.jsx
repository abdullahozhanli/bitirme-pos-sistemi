import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import ReceiptIcon from '@mui/icons-material/Receipt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import OrderDetailModal from '../../../shared/components/modals/OrderDetailModal.jsx';
import './CashierDashboard.css';

export default function CashierDashboard() {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailModalOpen, setOrderDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, table: null });
  const [activeTab, setActiveTab] = useState(0);
  const socketRef = useRef(null);

  const fetchPendingTables = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const response = await axios.get('/api/cashier/pending', { headers });
      const tablesData = Array.isArray(response.data) ? response.data : [];
      
      // Her masa için siparişleri çek
      const tablesWithOrders = await Promise.all(
        tablesData.map(async (table) => {
          try {
            const ordersRes = await axios.get('/api/waiter/orders', {
              headers,
              params: { 
                limit: 100 
              }
            });
            
            const orders = Array.isArray(ordersRes.data) 
              ? ordersRes.data 
              : (ordersRes.data?.items || []);
            
            const tableOrders = orders.filter(order => {
              const orderTable = order.tableId || order.table;
              const orderTableId = typeof orderTable === 'object' ? orderTable?._id : orderTable;
              const matchesTable = String(orderTableId) === String(table._id);
              // Ödeme bekleyen siparişler: serviste, hazirlaniyor, READY, tamamlandi (henüz ödenmemiş)
              const isPendingPayment = ['serviste', 'hazirlaniyor', 'READY', 'tamamlandi'].includes(order.status) &&
                                      order.status !== 'ödendi' && order.status !== 'PAID' && order.status !== 'SERVED';
              return matchesTable && isPendingPayment;
            });

            const totalAmount = tableOrders.reduce((sum, order) => {
              return sum + (order.total || order.totalPrice || 0);
            }, 0);

            return {
              ...table,
              orders: tableOrders,
              totalAmount,
              orderCount: tableOrders.length,
            };
          } catch (err) {
            console.error(`Masa ${table._id} siparişleri yüklenemedi:`, err);
            return {
              ...table,
              orders: [],
              totalAmount: 0,
              orderCount: 0,
            };
          }
        })
      );

      setTables(tablesWithOrders);
    } catch (err) {
      console.error('Masalar yüklenemedi:', err);
      setError(err.response?.data?.message || err.message || 'Masalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (table) => {
    if (processing) return;
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      await axios.post(`/api/cashier/checkout/${table._id}`, {}, { headers });
      
      setNotification({
        open: true,
        message: `Masa ${table.name} ödemesi alındı`,
        severity: 'success',
      });
      
      setConfirmDialog({ open: false, table: null });
      fetchPendingTables();
    } catch (err) {
      console.error('Ödeme işlemi başarısız:', err);
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Ödeme işlemi başarısız',
        severity: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openConfirmDialog = (table) => {
    setConfirmDialog({ open: true, table });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, table: null });
  };

  // Sipariş detaylarını görüntüle
  const handleViewOrderDetails = async (order) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      // Sipariş detaylarını tam olarak çek
      const orderId = order._id || order.id;
      const response = await axios.get(`/api/admin/orders`, {
        headers,
        params: { limit: 1000 }
      });
      
      const orders = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.items || []);
      
      const fullOrder = orders.find(o => String(o._id || o.id) === String(orderId));
      
      if (fullOrder) {
        setSelectedOrder(fullOrder);
        setOrderDetailModalOpen(true);
      } else {
        // Eğer tam detay bulunamazsa mevcut order'ı kullan
        setSelectedOrder(order);
        setOrderDetailModalOpen(true);
      }
    } catch (err) {
      console.error('Sipariş detayları yüklenemedi:', err);
      // Hata olsa bile mevcut order'ı göster
      setSelectedOrder(order);
      setOrderDetailModalOpen(true);
    }
  };

  // Siparişi ödendi yap
  const handleMarkAsPaid = async (orderId) => {
    if (processing) return;
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      await axios.put(`/api/admin/orders/${orderId}/pay`, {}, { headers });
      
      setNotification({
        open: true,
        message: 'Sipariş ödendi olarak işaretlendi',
        severity: 'success',
      });
      
      setOrderDetailModalOpen(false);
      setSelectedOrder(null);
      fetchPendingTables();
      if (activeTab === 1) {
        fetchAllOrders();
      }
    } catch (err) {
      console.error('Ödeme işaretlenemedi:', err);
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Ödeme işaretlenemedi',
        severity: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Siparişi iptal et
  const handleCancelOrder = async (orderId) => {
    if (processing) return;
    
    if (!window.confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) {
      return;
    }
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      await axios.put(`/api/admin/orders/${orderId}/status`, { status: 'iptal' }, { headers });
      
      setNotification({
        open: true,
        message: 'Sipariş iptal edildi',
        severity: 'success',
      });
      
      setOrderDetailModalOpen(false);
      setSelectedOrder(null);
      fetchPendingTables();
      if (activeTab === 1) {
        fetchAllOrders();
      }
    } catch (err) {
      console.error('Sipariş iptal edilemedi:', err);
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Sipariş iptal edilemedi',
        severity: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchPendingTables();

    // Socket.io bağlantısı
    const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';

    if (!socketRef.current) {
      socketRef.current = io(baseURL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('✅ Socket.io bağlandı (Kasa)');
        socket.emit('subscribe:tables');
      });

      socket.on('table:status:changed', (data) => {
        console.log('📡 Masa durumu değişti:', data);
        if (data.status === 'odeme_bekliyor' || data.status === 'dolu') {
          fetchPendingTables();
        } else if (data.status === 'bos') {
          fetchPendingTables();
        }
      });

      socket.on('table:order:created', (data) => {
        console.log('📡 Masaya sipariş eklendi:', data);
        fetchPendingTables();
        if (activeTab === 1) {
          fetchAllOrders();
        }
      });

      socket.on('table:payment:completed', (data) => {
        console.log('📡 Ödeme tamamlandı:', data);
        fetchPendingTables();
        if (activeTab === 1) {
          fetchAllOrders();
        }
      });

      socket.on('order:status:changed', (data) => {
        console.log('📡 Sipariş durumu değişti:', data);
        fetchPendingTables();
        if (activeTab === 1) {
          fetchAllOrders();
        }
      });
    }

    return () => {
      // Socket bağlantısını kapatma - component unmount olduğunda kapat
    };
  }, []);

  // activeTab değiştiğinde socket event handler'larını güncelle
  useEffect(() => {
    if (socketRef.current) {
      // Event handler'ları güncellemek için socket'i yeniden bağlamaya gerek yok
      // Closure içinde activeTab kullanılıyor, bu yeterli
    }
  }, [activeTab]);

  // Tüm siparişleri çek
  const fetchAllOrders = async () => {
    try {
      setOrdersLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const response = await axios.get('/api/admin/orders', {
        headers,
        params: { limit: 1000 }
      });

      const orders = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.items || []);

      // Tarihe göre sırala (en yeni önce)
      orders.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA;
      });

      setAllOrders(orders);
    } catch (err) {
      console.error('Siparişler yüklenemedi:', err);
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Siparişler yüklenemedi',
        severity: 'error',
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  // 30 saniyede bir otomatik güncelle
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchPendingTables();
      }
      if (!ordersLoading && activeTab === 1) {
        fetchAllOrders();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, ordersLoading, activeTab]);

  // Tab değiştiğinde siparişleri yükle
  useEffect(() => {
    if (activeTab === 1) {
      fetchAllOrders();
    }
  }, [activeTab]);

  if (loading && tables.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    if (status === 'ödendi' || status === 'PAID' || status === 'tamamlandi') return 'success';
    if (status === 'iptal' || status === 'CANCELED') return 'error';
    if (status === 'serviste' || status === 'READY' || status === 'SERVED') return 'info';
    if (status === 'hazirlaniyor' || status === 'IN_PREP' || status === 'SENT_TO_KITCHEN') return 'warning';
    return 'default';
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'ödendi': 'Ödendi',
      'PAID': 'Ödendi',
      'tamamlandi': 'Tamamlandı',
      'serviste': 'Serviste',
      'READY': 'Hazır',
      'SERVED': 'Servis Edildi',
      'hazirlaniyor': 'Hazırlanıyor',
      'IN_PREP': 'Hazırlanıyor',
      'SENT_TO_KITCHEN': 'Mutfakta',
      'iptal': 'İptal',
      'CANCELED': 'İptal',
      'CREATED': 'Oluşturuldu',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="cashier-dashboard">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Kasa Ekranı
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ödeme bekleyen masalar ve tüm siparişler
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Ödeme Bekleyen Masalar" />
          <Tab label="Tüm Siparişler" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <>
          {tables.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <TableRestaurantIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Ödeme Bekleyen Masa Yok
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Şu anda ödeme bekleyen masa bulunmuyor.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {tables.map((table) => (
                <Grid item xs={12} sm={6} md={4} key={table._id}>
                  <Card 
                    className="cashier-table-card"
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => setSelectedTable(table)}
                  >
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                          Masa {table.name}
                        </Typography>
                        <Chip 
                          label="Ödeme Bekliyor" 
                          color="warning" 
                          size="small"
                        />
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Stack spacing={1} sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Sipariş Sayısı:
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {table.orderCount}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Toplam Tutar:
                          </Typography>
                          <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                            {table.totalAmount.toFixed(2).replace('.', ',')} ₺
                          </Typography>
                        </Box>
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        startIcon={<PaymentIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfirmDialog(table);
                        }}
                        disabled={processing}
                        size="large"
                        sx={{ mt: 'auto', py: 1.5, fontWeight: 600 }}
                      >
                        Ödeme Al
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {activeTab === 1 && (
        <>
          {ordersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <CircularProgress />
            </Box>
          ) : allOrders.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Sipariş Bulunamadı
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Henüz sipariş bulunmuyor.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Sipariş No</strong></TableCell>
                    <TableCell><strong>Masa</strong></TableCell>
                    <TableCell><strong>Tarih</strong></TableCell>
                    <TableCell><strong>Durum</strong></TableCell>
                    <TableCell><strong>Tutar</strong></TableCell>
                    <TableCell><strong>İşlemler</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allOrders.map((order) => {
                    const tableName = order.table?.name || order.tableNumber || order.tableId?.name || '---';
                    const orderDate = new Date(order.createdAt || order.created_at);
                    const total = order.total || order.totalPrice || 0;
                    
                    return (
                      <TableRow key={order._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            #{order._id?.slice(-6).toUpperCase() || '---'}
                          </Typography>
                        </TableCell>
                        <TableCell>{tableName}</TableCell>
                        <TableCell>
                          {orderDate.toLocaleString('tr-TR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(order.status)}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {total.toFixed(2).replace('.', ',')} ₺
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewOrderDetails(order)}
                            sx={{ textTransform: 'none', mr: 1 }}
                          >
                            Detay
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Masa Detay Dialog */}
      <Dialog
        open={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Masa {selectedTable?.name} - Sipariş Detayları</Typography>
            <Chip label="Ödeme Bekliyor" color="warning" size="small" />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTable && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Toplam Tutar
                </Typography>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                  {selectedTable.totalAmount.toFixed(2).replace('.', ',')} ₺
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Siparişler ({selectedTable.orderCount})
              </Typography>

              {selectedTable.orders.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sipariş bulunamadı
                </Typography>
              ) : (
                <List>
                  {selectedTable.orders.map((order, index) => (
                    <React.Fragment key={order._id || index}>
                      <ListItem
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                        secondaryAction={
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOrderDetails(order);
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            Detay Gör
                          </Button>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body1" fontWeight={600}>
                                Sipariş #{order._id?.slice(-6).toUpperCase() || '---'}
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {(order.total || order.totalPrice || 0).toFixed(2).replace('.', ',')} ₺
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(order.createdAt || order.created_at).toLocaleString('tr-TR')}
                              </Typography>
                              {order.orderItems && order.orderItems.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  {order.orderItems.slice(0, 3).map((item, itemIndex) => (
                                    <Typography key={itemIndex} variant="body2" color="text.secondary">
                                      • {item.qty}x {item.product?.name || item.menuItem?.name || 'Ürün'}
                                    </Typography>
                                  ))}
                                  {order.orderItems.length > 3 && (
                                    <Typography variant="body2" color="text.secondary">
                                      ... ve {order.orderItems.length - 3} ürün daha
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < selectedTable.orders.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTable(null)}>Kapat</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<PaymentIcon />}
            onClick={() => {
              if (selectedTable) {
                openConfirmDialog(selectedTable);
                setSelectedTable(null);
              }
            }}
            disabled={processing}
          >
            Ödeme Al
          </Button>
        </DialogActions>
      </Dialog>

      {/* Onay Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
      >
        <DialogTitle>Ödeme Onayı</DialogTitle>
        <DialogContent>
          <Typography>
            Masa <strong>{confirmDialog.table?.name}</strong> için ödeme alınacak.
          </Typography>
          <Typography variant="h6" color="primary" sx={{ mt: 2, fontWeight: 700 }}>
            Toplam: {confirmDialog.table?.totalAmount.toFixed(2).replace('.', ',')} ₺
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} disabled={processing}>
            İptal
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleCheckout(confirmDialog.table)}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {processing ? 'İşleniyor...' : 'Ödemeyi Onayla'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sipariş Detay Modal */}
      <OrderDetailModal
        open={orderDetailModalOpen}
        onClose={() => {
          setOrderDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onMarkPaid={handleMarkAsPaid}
        onCancelOrder={handleCancelOrder}
      />

      {/* Bildirim */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
