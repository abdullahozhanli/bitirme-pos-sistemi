import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Divider,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentsIcon from '@mui/icons-material/Payments';
import PaymentIcon from '@mui/icons-material/Payment';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import ReceiptIcon from '@mui/icons-material/Receipt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import OrderDetailModal from '../../../shared/components/modals/OrderDetailModal.jsx';
import CashierTableCard from '../components/CashierTableCard.jsx';
import { getOrderPaymentDisplayText } from '../../../shared/utils/orderPayment';
import './CashierDashboard.css';

export default function CashierDashboard() {
  useAuth();
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
  const [singlePayDialog, setSinglePayDialog] = useState({ open: false, orderId: null });
  const [payMethod, setPayMethod] = useState('cash');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const socketRef = useRef(null);

  const PaymentMethodPicker = ({ value, onChange }) => (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      fullWidth
      sx={{ mt: 2 }}
    >
      <ToggleButton value="cash" sx={{ textTransform: 'none', fontWeight: 600, gap: 0.5 }}>
        <PaymentsIcon sx={{ fontSize: 18 }} />
        Nakit
      </ToggleButton>
      <ToggleButton value="card" sx={{ textTransform: 'none', fontWeight: 600, gap: 0.5 }}>
        <CreditCardIcon sx={{ fontSize: 18 }} />
        Kart
      </ToggleButton>
    </ToggleButtonGroup>
  );

  const fetchPendingTables = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const response = await axios.get('/api/cashier/tables', { headers });
      const tablesData = Array.isArray(response.data) ? response.data : [];

      setTables(
        tablesData.map((table) => ({
          ...table,
          orders: table.orders || [],
          orderCount: table.orderCount ?? (table.orders?.length || 0),
          totalAmount: table.totalAmount ?? 0,
          hasPendingPayment: Boolean(
            table.hasPendingPayment ?? ((table.orders?.length || 0) > 0 || (table.orderCount || 0) > 0)
          ),
        }))
      );
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

      await axios.post(`/api/cashier/checkout/${table._id}`, { method: payMethod }, { headers });
      
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

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      const response = await axios.get('/api/cashier/summary', { headers });
      setSummary(response.data);
    } catch (err) {
      console.error('Gün özeti yüklenemedi:', err);
      setNotification({
        open: true,
        message: err.response?.data?.message || 'Gün özeti yüklenemedi',
        severity: 'error',
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const openConfirmDialog = (table) => {
    setPayMethod('cash');
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
  const handleMarkAsPaid = async (orderId, method = payMethod) => {
    if (processing) return;
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      await axios.put(`/api/admin/orders/${orderId}/pay`, { method }, { headers });
      
      setNotification({
        open: true,
        message: 'Sipariş ödendi olarak işaretlendi',
        severity: 'success',
      });
      
      setOrderDetailModalOpen(false);
      setSelectedOrder(null);
      setSinglePayDialog({ open: false, orderId: null });
      fetchPendingTables();
      if (activeTab === 1) fetchAllOrders();
      if (activeTab === 2) fetchSummary();
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

      await axios.put(`/api/admin/orders/${orderId}/cancel`, { reason: 'Kasa iptali' }, { headers });
      
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

      socket.on('table:payment:completed', () => {
        fetchPendingTables();
        if (activeTab === 1) fetchAllOrders();
        if (activeTab === 2) fetchSummary();
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
      if (!ordersLoading && activeTab === 1) fetchAllOrders();
      if (!summaryLoading && activeTab === 2) fetchSummary();
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, ordersLoading, summaryLoading, activeTab]);

  useEffect(() => {
    if (activeTab === 1) fetchAllOrders();
    if (activeTab === 2) fetchSummary();
  }, [activeTab]);

  const pendingTables = tables.filter((t) => t.hasPendingPayment);
  const pendingTotal = pendingTables.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const pendingOrderCount = pendingTables.reduce((sum, t) => sum + (t.orderCount || 0), 0);

  const handleRefresh = () => {
    fetchPendingTables();
    if (activeTab === 1) fetchAllOrders();
    if (activeTab === 2) fetchSummary();
  };

  if (loading && tables.length === 0) {
    return (
      <div className="cashier-loading-wrap">
        <CircularProgress />
      </div>
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
      <header className="cashier-hero-card">
        <h1>Tüm masalar</h1>
        <p>Ödeme bekleyen masalar yeşil ile vurgulanır; müsait masalar soluk görünür.</p>
      </header>

      {activeTab === 0 && (
        <div className="cashier-stats-row">
          <span className="cashier-stat-pill">
            <TableRestaurantIcon />
            <span><strong>{tables.length}</strong> masa</span>
          </span>
          <span className="cashier-stat-pill cashier-stat-pill--highlight">
            <ReceiptIcon />
            <span><strong>{pendingTables.length}</strong> ödeme bekliyor</span>
          </span>
          <span className="cashier-stat-pill">
            <AccountBalanceWalletIcon />
            <span><strong>{pendingTotal.toFixed(2).replace('.', ',')} ₺</strong> tahsil edilecek</span>
          </span>
        </div>
      )}

      <div className="cashier-toolbar">
        <div className="cashier-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`cashier-tab ${activeTab === 0 ? 'active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            Masalar
          </button>
          <button
            type="button"
            role="tab"
            className={`cashier-tab ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            Tüm siparişler
          </button>
          <button
            type="button"
            role="tab"
            className={`cashier-tab ${activeTab === 2 ? 'active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            Gün özeti
          </button>
        </div>
        <button type="button" className="cashier-refresh-btn" onClick={handleRefresh} disabled={loading || ordersLoading || summaryLoading}>
          <RefreshIcon sx={{ fontSize: 18 }} />
          Yenile
        </button>
      </div>

      {activeTab === 0 && (
        <>
          {tables.length === 0 ? (
            <div className="cashier-empty-state">
              <TableRestaurantIcon />
              <h3>Masa tanımlı değil</h3>
              <p>Admin panelinden masa ekleyin.</p>
            </div>
          ) : (
            <div className="cashier-table-grid">
              {tables.map((table) => (
                <CashierTableCard
                  key={table._id}
                  table={table}
                  isSelected={selectedTable?._id === table._id}
                  processing={processing}
                  onClick={() => setSelectedTable(table)}
                  onPayClick={openConfirmDialog}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 2 && (
        <>
          {summaryLoading && !summary ? (
            <div className="cashier-loading-wrap">
              <CircularProgress />
            </div>
          ) : (
            <div className="cashier-summary-panel">
              <Typography variant="subtitle2" sx={{ color: '#7A7168', mb: 2 }}>
                Bugün ({summary?.date || '—'})
              </Typography>
              <div className="cashier-summary-grid">
                <div className="cashier-summary-card">
                  <span className="cashier-summary-label">Tahsil edilen</span>
                  <span className="cashier-summary-value">
                    {(summary?.totalCollected ?? 0).toFixed(2).replace('.', ',')} ₺
                  </span>
                  <span className="cashier-summary-meta">{summary?.paymentCount ?? 0} işlem</span>
                </div>
                <div className="cashier-summary-card">
                  <span className="cashier-summary-label">Nakit</span>
                  <span className="cashier-summary-value cashier-summary-value-sm">
                    {(summary?.cashTotal ?? 0).toFixed(2).replace('.', ',')} ₺
                  </span>
                </div>
                <div className="cashier-summary-card">
                  <span className="cashier-summary-label">Kart</span>
                  <span className="cashier-summary-value cashier-summary-value-sm">
                    {(summary?.cardTotal ?? 0).toFixed(2).replace('.', ',')} ₺
                  </span>
                </div>
                <div className="cashier-summary-card cashier-summary-card-pending">
                  <span className="cashier-summary-label">Bekleyen</span>
                  <span className="cashier-summary-value cashier-summary-value-sm">
                    {(summary?.pendingAmount ?? 0).toFixed(2).replace('.', ',')} ₺
                  </span>
                  <span className="cashier-summary-meta">
                    {summary?.pendingTableCount ?? 0} masa · {summary?.pendingOrderCount ?? 0} sipariş
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 1 && (
        <>
          {ordersLoading ? (
            <div className="cashier-loading-wrap">
              <CircularProgress />
            </div>
          ) : allOrders.length === 0 ? (
            <div className="cashier-empty-state">
              <ReceiptIcon />
              <h3>Sipariş bulunamadı</h3>
              <p>Henüz kayıtlı sipariş yok.</p>
            </div>
          ) : (
            <TableContainer className="cashier-orders-panel">
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
        className="cashier-detail-dialog"
        open={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        maxWidth="md"
        fullWidth
      >
        <div className="cashier-detail-header">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1F6B38' }}>
              Masa {selectedTable?.name}
            </Typography>
            <Chip
              label="Ödeme bekliyor"
              size="small"
              sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700, border: '1px solid #D7E7D8' }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#7A7168', mb: 0.5 }}>
            Tahsil edilecek tutar
          </Typography>
          <div className="cashier-detail-total">
            {selectedTable?.totalAmount?.toFixed(2).replace('.', ',')} ₺
          </div>
        </div>
        <DialogContent sx={{ pt: 2 }}>
          {selectedTable && (
            <Box>

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
                        className="cashier-order-list-item"
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
                                {order.paymentMethod ? ` · ${getOrderPaymentDisplayText(order)}` : ''}
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
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setSelectedTable(null)} sx={{ color: '#7A7168' }}>
            Kapat
          </Button>
          <Button
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={() => {
              if (selectedTable) {
                openConfirmDialog(selectedTable);
                setSelectedTable(null);
              }
            }}
            disabled={processing}
            sx={{
              background: 'linear-gradient(90deg, #2F8F39, #4CAF50, #67C96B)',
              fontWeight: 700,
              borderRadius: '20px',
              px: 3,
              boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
              '&:hover': { background: 'linear-gradient(90deg, #2E7D32, #43A047, #5CBF6A)' },
            }}
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
          <Typography variant="h6" sx={{ mt: 2, fontWeight: 700, color: '#3A7F3D' }}>
            Toplam: {confirmDialog.table?.totalAmount?.toFixed(2).replace('.', ',')} ₺
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Ödeme yöntemi seçin. Bu işlem geri alınamaz.
          </Typography>
          <PaymentMethodPicker value={payMethod} onChange={setPayMethod} />
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

      {/* Tek sipariş ödeme */}
      <Dialog open={singlePayDialog.open} onClose={() => setSinglePayDialog({ open: false, orderId: null })}>
        <DialogTitle>Tek sipariş tahsilat</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Ödeme yöntemini seçin.
          </Typography>
          <PaymentMethodPicker value={payMethod} onChange={setPayMethod} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSinglePayDialog({ open: false, orderId: null })} disabled={processing}>
            İptal
          </Button>
          <Button
            variant="contained"
            disabled={processing}
            onClick={() => handleMarkAsPaid(singlePayDialog.orderId, payMethod)}
            sx={{
              background: 'linear-gradient(90deg, #2F8F39, #4CAF50)',
              fontWeight: 700,
              borderRadius: '20px',
            }}
          >
            {processing ? 'İşleniyor...' : 'Ödendi işaretle'}
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
        onMarkPaid={(orderId) => {
          setPayMethod('cash');
          setSinglePayDialog({ open: true, orderId });
        }}
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
