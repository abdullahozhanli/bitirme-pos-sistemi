import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  InputAdornment,
  Chip,
  Stack,
  Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import QrCodeIcon from '@mui/icons-material/QrCode';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PageHeader from '../../../shared/components/layout/PageHeader';
import TableCard from '../components/TableCard';
import TableDetailPanel from '../components/TableDetailPanel';
import TableFormModal from '../components/TableFormModal';
import './AdminTableManagementPage.css';

export default function AdminTableManagementPage() {
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTableNumber, setQrTableNumber] = useState('');
  const [qrCapacity, setQrCapacity] = useState('');
  const [generatingQR, setGeneratingQR] = useState(false);
  const socketRef = useRef(null);

  // Durum mapping
  const statusMap = {
    bos: 'available',
    dolu: 'full',
    rezerve: 'reserved',
    odeme_bekliyor: 'payment_pending',
  };

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
      
      const response = await axios.get('/api/admin/tables', { headers });
      const tablesData = Array.isArray(response.data) ? response.data : [];
      setTables(tablesData);
      setFilteredTables(tablesData);
    } catch (err) {
      console.error('Masalar yüklenemedi:', err);
      setError(err.response?.data?.message || err.message || 'Masalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Masa seç
  const handleSelectTable = useCallback(async (table) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      const tableId = typeof table === 'string' ? table : (table._id || table);
      const response = await axios.get(`/api/admin/tables/${tableId}`, { headers });
      setSelectedTable(response.data);
    } catch (err) {
      console.error('Masa detayları yüklenemedi:', err);
      setError(err.response?.data?.message || 'Masa detayları yüklenemedi');
    }
  }, []);

  useEffect(() => {
    fetchTables();
    
    // Socket.io bağlantısı
    const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';

    socketRef.current = io(baseURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: false,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Socket.io bağlandı (Admin)');
      socket.emit('subscribe:tables');
    });

    // Masa güncellemeleri
    socket.on('table:updated', (data) => {
      console.log('📡 Masa güncellendi:', data);
      fetchTables();
      if (data.type === 'created') {
        setNotification({ open: true, message: `Yeni masa eklendi: ${data.table.name}`, severity: 'success' });
      }
    });

    socket.on('table:deleted', (data) => {
      console.log('📡 Masa silindi:', data);
      fetchTables();
      if (selectedTable?._id === data.tableId) {
        setSelectedTable(null);
      }
      setNotification({ open: true, message: 'Masa silindi', severity: 'info' });
    });

    socket.on('table:status:changed', (data) => {
      console.log('📡 Masa durumu değişti:', data);
      fetchTables();
      // Seçili masa güncellendiyse detayları yenile
      if (selectedTable?._id === data.tableId) {
        handleSelectTable({ _id: data.tableId });
      }
    });

    // Sipariş event'leri
    socket.on('table:order:created', (data) => {
      console.log('📡 Masaya sipariş eklendi:', data);
      fetchTables();
      if (selectedTable?._id === data.tableId) {
        handleSelectTable({ _id: data.tableId });
      }
      setNotification({ open: true, message: `${data.order.table?.name || 'Masaya'} yeni sipariş eklendi`, severity: 'info' });
    });

    socket.on('table:order:status:changed', (data) => {
      console.log('📡 Sipariş durumu değişti:', data);
      fetchTables();
      if (selectedTable?._id === data.tableId) {
        handleSelectTable({ _id: data.tableId });
      }
    });

    socket.on('table:order:canceled', (data) => {
      console.log('📡 Sipariş iptal edildi:', data);
      fetchTables();
      if (selectedTable?._id === data.tableId) {
        handleSelectTable({ _id: data.tableId });
      }
      setNotification({ open: true, message: 'Sipariş iptal edildi', severity: 'warning' });
    });

    socket.on('table:payment:completed', (data) => {
      console.log('📡 Ödeme yapıldı:', data);
      fetchTables();
      if (selectedTable?._id === data.tableId) {
        handleSelectTable({ _id: data.tableId });
      }
      setNotification({ open: true, message: 'Ödeme tamamlandı', severity: 'success' });
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [handleSelectTable, selectedTable]);

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
    reserved: tables.filter(t => t.status === 'rezerve').length,
    paymentPending: tables.filter(t => t.status === 'odeme_bekliyor').length,
  };

  // Yeni masa ekle
  const handleAddTable = () => {
    setEditingTable(null);
    setIsModalOpen(true);
  };

  // Masa düzenle
  const handleEditTable = (table) => {
    setEditingTable(table);
    setIsModalOpen(true);
  };

  // Modal kapat
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTable(null);
  };

  // Masa kaydedildi (ekleme veya güncelleme)
  const handleTableSaved = () => {
    fetchTables();
    handleCloseModal();
    if (selectedTable && editingTable && selectedTable._id === editingTable._id) {
      // Seçili masa güncellendiyse detayları yenile
      handleSelectTable(editingTable);
    }
  };

  // Masa silindi
  const handleTableDeleted = () => {
    fetchTables();
    if (selectedTable) {
      setSelectedTable(null);
    }
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
      <PageHeader 
        title="Masa Yönetimi" 
        subtitle="Tüm masaların anlık durumu ve yönetimi"
      />

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
        <Chip
          label={`Rezerve: ${summary.reserved}`}
          color="warning"
          variant="outlined"
        />
        {summary.paymentPending > 0 && (
          <Chip
            label={`Ödeme Bekliyor: ${summary.paymentPending}`}
            color="info"
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
              variant={statusFilter === 'rezerve' ? 'contained' : 'outlined'}
              size="small"
              color="warning"
              onClick={() => setStatusFilter('rezerve')}
            >
              Rezerve
            </Button>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            onClick={() => window.location.href = '/admin/qr-kodlar'}
            sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}
          >
            QR Kod ile Masa Oluştur
          </Button>
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
                  : 'Henüz masa eklenmemiş.'}
              </Typography>
            </Box>
          ) : (
            <Box className="table-grid">
              {filteredTables.map((table) => (
                <TableCard
                  key={table._id}
                  table={table}
                  statusLabels={statusLabels}
                  isSelected={selectedTable?._id === table._id}
                  onClick={() => handleSelectTable(table)}
                  onEdit={() => handleEditTable(table)}
                />
              ))}
            </Box>
          )}
        </Paper>

        {/* Sağ Panel: Masa Detayları */}
        {selectedTable ? (
          <TableDetailPanel
            table={selectedTable}
            statusLabels={statusLabels}
            onEdit={() => handleEditTable(selectedTable)}
            onDelete={handleTableDeleted}
            onRefresh={fetchTables}
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

      {/* Toast Bildirimleri */}
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
    </Box>
  );
}

