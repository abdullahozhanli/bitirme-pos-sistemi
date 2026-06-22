import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { createAuthenticatedSocket, getStaffSocketToken } from '../../../shared/utils/socketClient';
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
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import TableCard from '../../admin/components/TableCard.jsx';
import WaiterTableDetailPanel from '../components/WaiterTableDetailPanel.jsx';
import OrderCreateModal from '../components/OrderCreateModal.jsx';
import { TABLE_STATUS, STATUS_LABELS, STATUS_COLORS, STATUS_CLASS_MAP } from '../constants/tableStatus.js';
import './WaiterTableManagementPage.css';

export default function WaiterTableManagementPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const socketRef = useRef(null);
  const handleSelectTableRef = useRef(null);

  // Masaları çek
  const fetchTables = useCallback(async () => {
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
          } catch {
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
  }, []);

  useEffect(() => {
    fetchTables();
    
    // Socket.io bağlantısı
    const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';

    const token = getStaffSocketToken();
    if (!token) return undefined;

    const socket = createAuthenticatedSocket(baseURL, token);
    if (!socket) return undefined;

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe:tables');

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
      
      setSelectedTable(prev => {
        if (prev && data.table && String(data.table._id) === String(prev._id) && handleSelectTableRef.current) {
          handleSelectTableRef.current(data.table);
        }
        return prev;
      });
    });

    // Masa durumu değişti
    socket.on('table:status:changed', (data) => {
      console.log('📡 Masa durumu değişti:', data);
      fetchTables();
      
      setSelectedTable(prev => {
        if (prev && String(data.tableId) === String(prev._id) && handleSelectTableRef.current) {
          handleSelectTableRef.current({ _id: data.tableId });
        }
        return prev;
      });
    });

    // Masaya sipariş eklendi
    socket.on('table:order:created', (data) => {
      console.log('📡 Masaya sipariş eklendi:', data);
      fetchTables();
      
      setSelectedTable(prev => {
        if (prev && String(data.tableId) === String(prev._id) && handleSelectTableRef.current) {
          handleSelectTableRef.current({ _id: data.tableId });
        }
        return prev;
      });
      
      setNotification({ 
        open: true, 
        message: `🔔 ${data.table?.name || 'Masa'} masasına yeni sipariş!`, 
        severity: 'success' 
      });
    });

    // Sipariş iptal edildi
    socket.on('table:order:canceled', (data) => {
      console.log('📡 Sipariş iptal edildi:', data);
      fetchTables();
      
      setSelectedTable(prev => {
        if (prev && String(data.tableId) === String(prev._id) && handleSelectTableRef.current) {
          handleSelectTableRef.current({ _id: data.tableId });
        }
        return prev;
      });
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
      
      setSelectedTable(prev => {
        if (prev && String(data.tableId) === String(prev._id) && handleSelectTableRef.current) {
          handleSelectTableRef.current({ _id: data.tableId });
        }
        return prev;
      });
      
      setNotification({ 
        open: true, 
        message: `💰 ${data.table?.name || 'Masa'} masası için ödeme tamamlandı`, 
        severity: 'success' 
      });
    });

    // Cleanup
    return () => {
      socket.disconnect();
      console.log('🔌 Socket.io bağlantısı kapatıldı (Garson Masa Yönetimi)');
    };
  }, []);

  // Debounce arama terimi
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtreleme ve arama
  useEffect(() => {
    let filtered = [...tables];

    // Arama filtresi (debounced)
    if (debouncedSearchTerm.trim()) {
      const search = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(table =>
        table.name?.toLowerCase().includes(search) ||
        String(table.name || '').includes(search)
      );
    }

    setFilteredTables(filtered);
  }, [tables, debouncedSearchTerm]);

  // Özet istatistikler - Tüm dataset üzerinden (filtre bağımsız)
  const summary = useMemo(() => ({
    total: tables.length,
    available: tables.filter(t => t.status === TABLE_STATUS.AVAILABLE).length,
    full: tables.filter(t => t.status === TABLE_STATUS.OCCUPIED).length,
    paymentPending: tables.filter(t => t.status === TABLE_STATUS.PAYMENT_PENDING).length,
    reserved: tables.filter(t => t.status === TABLE_STATUS.RESERVED).length,
  }), [tables]);

  // Masa seç
  const handleSelectTable = useCallback(async (table) => {
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
      
      const selectedTableData = {
        ...tableData,
        orders: orders,
        activeOrders: orders.filter(o => 
          ['hazirlaniyor', 'serviste', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'].includes(o.status)
        ),
      };
      
      setSelectedTable(selectedTableData);
      
      // Mobilde detay panelini aç
      if (isMobile) {
        setDetailPanelOpen(true);
      }
    } catch (err) {
      console.error('Masa detayları yüklenemedi:', err);
      setError(err.response?.data?.message || 'Masa detayları yüklenemedi');
    }
  }, [isMobile]);
  
  // Ref'e kaydet
  handleSelectTableRef.current = handleSelectTable;

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
    if (selectedTable.status !== TABLE_STATUS.AVAILABLE) {
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

  // Debug: Sayfa render ediliyor mu kontrol et
  console.log('WaiterTableManagementPage render:', { loading, tables: tables.length, error });

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box className="waiter-table-management-header" sx={{ mb: { xs: 2, lg: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1, lg: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, lg: 2 } }}>
          <IconButton onClick={() => navigate('/waiter')} size="small" sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '1.25rem', lg: '2rem' } }}>
              Masa Haritası
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', lg: '0.875rem' } }}>
              Tüm masaların anlık durumu
            </Typography>
          </Box>
        </Box>
        <Button
          className="waiter-table-refresh-btn"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchTables}
          disabled={loading}
          size={isMobile ? 'small' : 'medium'}
          sx={{ fontSize: { xs: '0.75rem', lg: '0.875rem' } }}
        >
          Yenile
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Özet İstatistikler - Tüm dataset üzerinden */}
      <Box className="waiter-table-stats" sx={{ mb: { xs: 2, lg: 3 }, display: 'flex', gap: { xs: 1, lg: 2 }, flexWrap: 'wrap' }}>
        <Chip
          icon={<TableRestaurantIcon sx={{ fontSize: { xs: '16px !important', lg: '20px !important' } }} />}
          label={`Toplam: ${summary.total}`}
          sx={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            fontWeight: 600,
            height: { xs: 28, lg: 32 },
            '& .MuiChip-label': {
              fontSize: { xs: '0.75rem', lg: '0.875rem' },
              padding: { xs: '0 8px', lg: '0 12px' },
            },
          }}
        />
        <Chip
          label={`Müsait: ${summary.available}`}
          sx={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #D1FAE5',
            color: '#059669',
            fontWeight: 600,
            height: { xs: 28, lg: 32 },
            '& .MuiChip-label': {
              fontSize: { xs: '0.75rem', lg: '0.875rem' },
              padding: { xs: '0 8px', lg: '0 12px' },
            },
          }}
        />
        <Chip
          label={`Dolu: ${summary.full}`}
          sx={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontWeight: 600,
            height: { xs: 28, lg: 32 },
            '& .MuiChip-label': {
              fontSize: { xs: '0.75rem', lg: '0.875rem' },
              padding: { xs: '0 8px', lg: '0 12px' },
            },
          }}
        />
        {summary.paymentPending > 0 && (
          <Chip
            icon={<PaymentIcon sx={{ fontSize: { xs: '16px !important', lg: '20px !important' } }} />}
            label={`Ödeme: ${summary.paymentPending}`}
            sx={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #DBEAFE',
              color: '#2563EB',
              fontWeight: 600,
              height: { xs: 28, lg: 32 },
              '& .MuiChip-label': {
                fontSize: { xs: '0.75rem', lg: '0.875rem' },
                padding: { xs: '0 8px', lg: '0 12px' },
              },
            }}
          />
        )}
      </Box>

      {/* Arama */}
      <Paper className="waiter-table-filters" sx={{ p: { xs: 1.5, lg: 2 }, mb: { xs: 2, lg: 3 } }}>
        <TextField
          className="waiter-table-search"
          fullWidth
          size="small"
          placeholder="Masa ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: { xs: '18px', lg: '20px' } }} />
              </InputAdornment>
            ),
          }}
          sx={{ 
            '& .MuiInputBase-root': {
              fontSize: { xs: '0.875rem', lg: '1rem' },
              height: { xs: 40, lg: 40 },
            }
          }}
        />
      </Paper>

      {/* Ana İçerik */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' }, gap: { xs: 2, lg: 3 } }}>
        {/* Sol Panel: Masa Grid */}
        <Paper sx={{ p: { xs: 2, lg: 3 }, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, fontSize: { xs: '1rem', lg: '1.25rem' } }}>
            Masalar ({filteredTables.length})
          </Typography>
          
          {filteredTables.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: { xs: 4, lg: 8 }, color: 'text.secondary' }}>
              <TableRestaurantIcon sx={{ fontSize: { xs: 48, lg: 64 }, mb: 2, opacity: 0.3 }} />
              <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', lg: '1rem' } }}>
                {searchTerm
                  ? 'Arama kriterlerinize uygun masa bulunamadı.'
                  : 'Henüz masa bulunmuyor.'}
              </Typography>
            </Box>
          ) : (
            <Box 
              className="waiter-table-grid"
            >
              {filteredTables.map((table) => (
                <TableCard
                  key={table._id || table.id}
                  table={table}
                  isSelected={selectedTable?._id === table._id}
                  onClick={() => handleSelectTable(table)}
                />
              ))}
            </Box>
          )}
        </Paper>

        {/* Sağ Panel: Masa Detayları ve Aksiyonlar - Desktop */}
        {!isMobile && (
          <>
            {selectedTable ? (
              <WaiterTableDetailPanel
                table={selectedTable}
                statusLabels={STATUS_LABELS}
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
          </>
        )}
      </Box>

      {/* Mobil: Detay Paneli Drawer */}
      {isMobile && (
        <Drawer
          anchor="bottom"
          open={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setSelectedTable(null);
          }}
          PaperProps={{
            sx: {
              maxHeight: '85vh',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <Box sx={{ 
            overflowY: 'auto', 
            maxHeight: '85vh',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#D1D5DB',
              borderRadius: '2px',
            }
          }}>
            {selectedTable ? (
              <WaiterTableDetailPanel
                table={selectedTable}
                statusLabels={STATUS_LABELS}
                onCreateOrder={handleCreateOrder}
                onRefresh={() => {
                  fetchTables();
                  handleSelectTable(selectedTable);
                }}
                onClose={() => {
                  setDetailPanelOpen(false);
                  setSelectedTable(null);
                }}
              />
            ) : (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">Masa seçilmedi</Typography>
              </Box>
            )}
          </Box>
        </Drawer>
      )}

      {/* Floating Action Button - Hızlı Sipariş - Sadece Desktop */}
      {!isMobile && selectedTable && selectedTable.status === TABLE_STATUS.AVAILABLE && (
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
