import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Snackbar,
  Fab,
  Badge,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WaiterTableCard from '../components/WaiterTableCard.jsx';
import WaiterTableDetailPanel from '../components/WaiterTableDetailPanel.jsx';
import OrderCreateModal from '../components/OrderCreateModal.jsx';
import './WaiterTableManagementPage.css';

export default function WaiterTableManagementPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const socketRef = useRef(null);

  const statusLabels = {
    bos: 'Müsait',
    dolu: 'Dolu',
    rezerve: 'Rezerve',
    odeme_bekliyor: 'Ödeme Bekliyor',
  };

  // Masaları çek
  const fetchTables = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      const response = await axios.get('/api/waiter/tables', { headers });
      const tablesData = Array.isArray(response.data) ? response.data : [];
      
      // Her masa için aktif siparişleri getir
      const tablesWithOrders = await Promise.all(
        tablesData.map(async (table) => {
          try {
            const ordersRes = await axios.get('/api/waiter/orders', {
              headers,
              params: { tableId: table._id, limit: 100 }
            });
            const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.items || []);
            const activeOrders = orders.filter(o => 
              ['hazirlaniyor', 'serviste', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'].includes(o.status)
            );
            
            return {
              ...table,
              activeOrderCount: activeOrders.length,
              totalAmount: activeOrders.reduce((sum, o) => sum + (o.total || o.totalPrice || 0), 0),
              hasActiveOrder: activeOrders.length > 0,
              activeOrders: activeOrders,
            };
          } catch (err) {
            return {
              ...table,
              activeOrderCount: 0,
              totalAmount: 0,
              hasActiveOrder: false,
              activeOrders: [],
            };
          }
        })
      );
      
      setTables(tablesWithOrders);
      setFilteredTables(tablesWithOrders);
    } catch (err) {
      console.error('Masalar yüklenemedi:', err);
      setError(err.response?.data?.message || err.message || 'Masalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    
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
      console.log('✅ Socket.io bağlandı (Garson Masa Yönetimi)');
      socket.emit('subscribe:tables');
      
      // Garson odasına abone ol (bildirimler için)
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Token'dan user ID'yi çıkar (JWT decode)
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

    // Masa güncellendi
    socket.on('table:updated', (data) => {
      console.log('📡 Masa güncellendi:', data);
      fetchTables();
      
      if (selectedTable && data.table && String(data.table._id) === String(selectedTable._id)) {
        handleSelectTable(data.table);
      }
    });

    // Masa durumu değişti
    socket.on('table:status:changed', (data) => {
      console.log('📡 Masa durumu değişti:', data);
      fetchTables();
      
      if (selectedTable && String(data.tableId) === String(selectedTable._id)) {
        handleSelectTable({ _id: data.tableId });
      }
    });

    // Masaya sipariş eklendi
    socket.on('table:order:created', (data) => {
      console.log('📡 Masaya sipariş eklendi:', data);
      fetchTables();
      
      if (selectedTable && String(data.tableId) === String(selectedTable._id)) {
        handleSelectTable({ _id: data.tableId });
      }
      
      setNotification({ 
        open: true, 
        message: `🔔 ${data.table.name} masasına yeni sipariş!`, 
        severity: 'success' 
      });
    });

    // Sipariş iptal edildi
    socket.on('table:order:canceled', (data) => {
      console.log('📡 Sipariş iptal edildi:', data);
      fetchTables();
      
      if (selectedTable && String(data.tableId) === String(selectedTable._id)) {
        handleSelectTable({ _id: data.tableId });
      }
    });

    // Ürün hazır bildirimi (mutfaktan)
    socket.on('item:ready', (data) => {
      console.log('📡 Ürün hazır bildirimi:', data);
      const tableName = data.table?.name || data.tableNumber || data.order?.tableId?.name || 'Bilinmeyen';
      const itemName = data.order?.orderItems?.[0]?.name || data.productName || 'Ürün';
      
      setNotification({ 
        open: true, 
        message: `✅ ${tableName} masası - ${itemName} hazır!`, 
        severity: 'success' 
      });
      
      // Masaları yenile
      fetchTables();
    });

    // Ödeme yapıldı
    socket.on('table:payment:completed', (data) => {
      console.log('📡 Ödeme yapıldı:', data);
      fetchTables();
      
      if (selectedTable && String(data.tableId) === String(selectedTable._id)) {
        handleSelectTable({ _id: data.tableId });
      }
      
      setNotification({ 
        open: true, 
        message: `💰 ${data.table.name} masası için ödeme tamamlandı`, 
        severity: 'success' 
      });
    });

    // Cleanup
    return () => {
      socket.disconnect();
      console.log('🔌 Socket.io bağlantısı kapatıldı (Garson Masa Yönetimi)');
    };
  }, [selectedTable]);

  // Filtreleme ve arama
  useEffect(() => {
    let filtered = [...tables];

    // Durum filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(table => table.status === statusFilter);
    }

    // Arama filtresi
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(table =>
        table.name?.toLowerCase().includes(search)
      );
    }

    setFilteredTables(filtered);
  }, [tables, statusFilter, searchTerm]);

  // Özet istatistikler
  const summary = {
    total: tables.length,
    available: tables.filter(t => t.status === 'bos').length,
    full: tables.filter(t => t.status === 'dolu').length,
    paymentPending: tables.filter(t => t.status === 'odeme_bekliyor').length,
  };

  // Masa seç
  const handleSelectTable = async (table) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      // Masa detaylarını getir
      const [tableRes, ordersRes] = await Promise.all([
        axios.get(`/api/waiter/tables`, { headers }),
        axios.get('/api/waiter/orders', { 
          headers,
          params: { tableId: table._id || table.id, limit: 100 }
        })
      ]);
      
      const allTables = Array.isArray(tableRes.data) ? tableRes.data : [];
      const tableData = allTables.find(t => String(t._id || t.id) === String(table._id || table.id)) || table;
      const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.items || []);
      
      setSelectedTable({
        ...tableData,
        orders: orders,
        activeOrders: orders.filter(o => 
          ['hazirlaniyor', 'serviste', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'].includes(o.status)
        ),
      });
    } catch (err) {
      console.error('Masa detayları yüklenemedi:', err);
      setError(err.response?.data?.message || 'Masa detayları yüklenemedi');
    }
  };

  // Yeni sipariş al
  const handleCreateOrder = () => {
    if (!selectedTable) {
      setNotification({ 
        open: true, 
        message: 'Lütfen önce bir masa seçin', 
        severity: 'warning' 
      });
      return;
    }
    
    // Sadece müsait masalarda sipariş alınabilir
    if (selectedTable.status !== 'bos') {
      setNotification({ 
        open: true, 
        message: 'Sadece müsait masalarda sipariş alabilirsiniz', 
        severity: 'warning' 
      });
      return;
    }
    
    setIsOrderModalOpen(true);
  };

  // Sipariş kaydedildi
  const handleOrderSaved = () => {
    fetchTables();
    if (selectedTable) {
      handleSelectTable(selectedTable);
    }
    setIsOrderModalOpen(false);
  };

  if (loading && tables.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/waiter')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              Masa Haritası
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tüm masaların anlık durumu
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchTables}
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
          icon={<TableRestaurantIcon />}
          label={`Toplam: ${summary.total}`}
          color="default"
          variant="outlined"
        />
        <Chip
          label={`Müsait: ${summary.available}`}
          color="success"
          variant="outlined"
        />
        <Chip
          label={`Dolu: ${summary.full}`}
          color="error"
          variant="outlined"
        />
        {summary.paymentPending > 0 && (
          <Chip
            icon={<PaymentIcon />}
            label={`Ödeme Bekliyor: ${summary.paymentPending}`}
            color="warning"
            variant="outlined"
          />
        )}
      </Box>

      {/* Filtreleme ve Arama */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder="Masa ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant={statusFilter === 'all' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setStatusFilter('all')}
            >
              Tümü
            </Button>
            <Button
              variant={statusFilter === 'bos' ? 'contained' : 'outlined'}
              size="small"
              color="success"
              onClick={() => setStatusFilter('bos')}
            >
              Müsait
            </Button>
            <Button
              variant={statusFilter === 'dolu' ? 'contained' : 'outlined'}
              size="small"
              color="error"
              onClick={() => setStatusFilter('dolu')}
            >
              Dolu
            </Button>
            <Button
              variant={statusFilter === 'odeme_bekliyor' ? 'contained' : 'outlined'}
              size="small"
              color="warning"
              onClick={() => setStatusFilter('odeme_bekliyor')}
            >
              Ödeme Bekliyor
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Ana İçerik */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' }, gap: 3 }}>
        {/* Sol Panel: Masa Grid */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Masalar ({filteredTables.length})
          </Typography>
          
          {filteredTables.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <TableRestaurantIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="body1">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Arama kriterlerinize uygun masa bulunamadı.'
                  : 'Henüz masa bulunmuyor.'}
              </Typography>
            </Box>
          ) : (
            <Box className="waiter-table-grid">
              {filteredTables.map((table) => (
                <WaiterTableCard
                  key={table._id || table.id}
                  table={table}
                  statusLabels={statusLabels}
                  isSelected={selectedTable?._id === table._id}
                  onClick={() => handleSelectTable(table)}
                />
              ))}
            </Box>
          )}
        </Paper>

        {/* Sağ Panel: Masa Detayları ve Aksiyonlar */}
        {selectedTable ? (
          <WaiterTableDetailPanel
            table={selectedTable}
            statusLabels={statusLabels}
            onCreateOrder={handleCreateOrder}
            onRefresh={() => {
              fetchTables();
              handleSelectTable(selectedTable);
            }}
          />
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <TableRestaurantIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography variant="body1">
              Detayları görmek için bir masa seçin
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Floating Action Button - Hızlı Sipariş */}
      {selectedTable && selectedTable.status === 'bos' && (
        <Fab
          color="primary"
          aria-label="Yeni Sipariş"
          onClick={handleCreateOrder}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Sipariş Oluşturma Modal */}
      <OrderCreateModal
        open={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        table={selectedTable}
        onSaved={handleOrderSaved}
      />

      {/* Bildirim Snackbar - Animasyonlu */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbar-root': {
            animation: 'slideInFromTop 0.3s ease-out',
          }
        }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          sx={{ 
            width: '100%',
            animation: notification.severity === 'success' ? 'pulseNotification 2s ease-in-out infinite' : 'none',
            boxShadow: notification.severity === 'success' ? '0 4px 12px rgba(76, 175, 80, 0.4)' : 'none',
            fontSize: '1rem',
            fontWeight: 600,
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
