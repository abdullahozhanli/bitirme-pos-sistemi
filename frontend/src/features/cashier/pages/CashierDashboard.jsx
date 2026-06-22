import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { createAuthenticatedSocket, getStaffSocketToken } from '../../../shared/utils/socketClient';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Drawer,
  useMediaQuery,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentsIcon from '@mui/icons-material/Payments';
import PaymentIcon from '@mui/icons-material/Payment';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import OrderDetailModal from '../../../shared/components/modals/OrderDetailModal.jsx';
import TableCard from '../../admin/components/TableCard.jsx';
import CashierTableDetailPanel from '../components/CashierTableDetailPanel.jsx';
import './CashierDashboard.css';

function normalizeTable(table) {
  const orders = table.orders || [];
  const hasPendingPayment = Boolean(
    table.hasPendingPayment ?? (orders.length > 0 || (table.orderCount || 0) > 0)
  );

  return {
    ...table,
    orders,
    orderCount: table.orderCount ?? orders.length,
    totalAmount: table.totalAmount ?? 0,
    hasPendingPayment,
    status: hasPendingPayment ? 'odeme_bekliyor' : (table.status || 'bos'),
    activeOrders: orders,
    hasActiveOrder: hasPendingPayment,
  };
}

function mapTableForCard(table) {
  return normalizeTable(table);
}

export default function CashierDashboard() {
  useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailModalOpen, setOrderDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [singlePayDialog, setSinglePayDialog] = useState({ open: false, orderId: null });
  const [payMethod, setPayMethod] = useState('cash');
  const socketRef = useRef(null);
  const selectedTableRef = useRef(null);

  useEffect(() => {
    selectedTableRef.current = selectedTable;
  }, [selectedTable]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
  };

  const fetchPendingTables = useCallback(async (keepSelection = true) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/cashier/tables', { headers: getAuthHeaders() });
      const tablesData = (Array.isArray(response.data) ? response.data : []).map(normalizeTable);
      setTables(tablesData);

      if (keepSelection && selectedTableRef.current) {
        const updated = tablesData.find((t) => t._id === selectedTableRef.current._id);
        if (updated) {
          setSelectedTable(updated);
        } else {
          setSelectedTable(null);
          setDetailPanelOpen(false);
        }
      }
    } catch (err) {
      console.error('Masalar yüklenemedi:', err);
      setError(err.response?.data?.message || err.message || 'Masalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    if (isMobile) {
      setDetailPanelOpen(true);
    }
  };

  const handleCloseDetail = () => {
    setDetailPanelOpen(false);
    setSelectedTable(null);
  };

  const handleRefresh = () => {
    fetchPendingTables(true);
  };

  const handleCheckout = async () => {
    if (processing || !selectedTable?.hasPendingPayment) return;

    try {
      setProcessing(true);
      await axios.post(
        `/api/cashier/checkout/${selectedTable._id}`,
        { method: payMethod },
        { headers: getAuthHeaders() }
      );

      setNotification({
        open: true,
        message: `Masa ${selectedTable.name} ödemesi alındı`,
        severity: 'success',
      });

      setSelectedTable(null);
      setDetailPanelOpen(false);
      await fetchPendingTables(false);
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

  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order);
    setOrderDetailModalOpen(true);

    const orderId = order._id || order.id;
    if (!orderId) return;

    axios
      .get(`/api/orders/${orderId}`, { headers: getAuthHeaders() })
      .then((response) => {
        setSelectedOrder((current) => {
          const currentId = current?._id || current?.id;
          if (String(currentId) !== String(orderId)) return current;
          return response.data;
        });
      })
      .catch((err) => {
        console.error('Sipariş detayları yenilenemedi:', err);
      });
  };

  const handleMarkAsPaid = async (orderId, method = payMethod) => {
    if (processing) return;

    try {
      setProcessing(true);
      await axios.put(`/api/admin/orders/${orderId}/pay`, { method }, { headers: getAuthHeaders() });

      setNotification({
        open: true,
        message: 'Sipariş ödendi olarak işaretlendi',
        severity: 'success',
      });

      setOrderDetailModalOpen(false);
      setSelectedOrder(null);
      setSinglePayDialog({ open: false, orderId: null });
      await fetchPendingTables(true);
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

  const handleCancelOrder = async (orderId) => {
    if (processing) return;
    if (!window.confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return;

    try {
      setProcessing(true);
      await axios.put(
        `/api/admin/orders/${orderId}/cancel`,
        { reason: 'Kasa iptali' },
        { headers: getAuthHeaders() }
      );

      setNotification({
        open: true,
        message: 'Sipariş iptal edildi',
        severity: 'success',
      });

      setOrderDetailModalOpen(false);
      setSelectedOrder(null);
      await fetchPendingTables(true);
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

  const openSinglePayDialog = (orderId) => {
    setPayMethod('cash');
    setSinglePayDialog({ open: true, orderId });
  };

  useEffect(() => {
    fetchPendingTables(false);
  }, []);

  useEffect(() => {
    const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';
    const token = getStaffSocketToken();
    if (socketRef.current || !token) return undefined;

    const socket = createAuthenticatedSocket(baseURL, token);
    if (!socket) return undefined;

    socketRef.current = socket;

    const refreshTables = () => {
      fetchPendingTables(true);
    };

    socket.on('connect', () => {
      socket.emit('subscribe:tables');
    });

    socket.on('table:status:changed', refreshTables);
    socket.on('table:order:created', refreshTables);
    socket.on('table:payment:completed', refreshTables);
    socket.on('order:status:changed', refreshTables);
    socket.on('table:updated', refreshTables);

    return () => {
      socket.off('table:status:changed', refreshTables);
      socket.off('table:order:created', refreshTables);
      socket.off('table:payment:completed', refreshTables);
      socket.off('order:status:changed', refreshTables);
      socket.off('table:updated', refreshTables);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchPendingTables]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchPendingTables(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, fetchPendingTables]);

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

  return (
    <div className="cashier-dashboard">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' }, gap: { xs: 2, lg: 3 } }}>
        <Paper sx={{ p: { xs: 2, lg: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', lg: '1.25rem' } }}>
              Masalar ({tables.length})
            </Typography>
            <button
              type="button"
              className="cashier-refresh-btn"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
              Yenile
            </button>
          </Box>

          {tables.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <TableRestaurantIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="body1">Henüz masa tanımlı değil. Admin panelinden masa ekleyin.</Typography>
            </Box>
          ) : (
            <Box className="cashier-table-grid">
              {tables.map((table) => (
                <TableCard
                  key={table._id}
                  table={mapTableForCard(table)}
                  isSelected={selectedTable?._id === table._id}
                  onClick={() => handleSelectTable(table)}
                />
              ))}
            </Box>
          )}
        </Paper>

        {!isMobile && (
          selectedTable ? (
            <CashierTableDetailPanel
              table={selectedTable}
              payMethod={payMethod}
              onPayMethodChange={setPayMethod}
              processing={processing}
              onCheckout={handleCheckout}
              onViewOrder={handleViewOrderDetails}
              onPayOrder={openSinglePayDialog}
              onCancelOrder={handleCancelOrder}
              onRefresh={handleRefresh}
            />
          ) : (
            <div className="cashier-detail-empty-panel">
              <TableRestaurantIcon />
              <p>Detayları görmek için bir masa seçin</p>
            </div>
          )
        )}
      </Box>

      {isMobile && (
        <Drawer
          anchor="bottom"
          open={detailPanelOpen}
          onClose={handleCloseDetail}
          PaperProps={{
            sx: {
              maxHeight: '85vh',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            },
          }}
        >
          <Box sx={{ overflowY: 'auto', maxHeight: '85vh' }}>
            {selectedTable && (
              <CashierTableDetailPanel
                table={selectedTable}
                payMethod={payMethod}
                onPayMethodChange={setPayMethod}
                processing={processing}
                onCheckout={handleCheckout}
                onViewOrder={handleViewOrderDetails}
                onPayOrder={openSinglePayDialog}
                onCancelOrder={handleCancelOrder}
                onRefresh={handleRefresh}
                onClose={handleCloseDetail}
              />
            )}
          </Box>
        </Drawer>
      )}

      <Dialog open={singlePayDialog.open} onClose={() => setSinglePayDialog({ open: false, orderId: null })}>
        <DialogTitle>Tek sipariş tahsilat</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Ödeme yöntemini seçin.
          </Typography>
          <ToggleButtonGroup
            value={payMethod}
            exclusive
            onChange={(_, v) => v && setPayMethod(v)}
            fullWidth
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSinglePayDialog({ open: false, orderId: null })} disabled={processing}>
            İptal
          </Button>
          <Button
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={18} color="inherit" /> : <PaymentIcon />}
            onClick={() => handleMarkAsPaid(singlePayDialog.orderId, payMethod)}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            {processing ? 'İşleniyor...' : 'Ödendi işaretle'}
          </Button>
        </DialogActions>
      </Dialog>

      <OrderDetailModal
        open={orderDetailModalOpen}
        onClose={() => {
          setOrderDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onMarkPaid={(orderId) => openSinglePayDialog(orderId)}
        onCancelOrder={handleCancelOrder}
      />

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
