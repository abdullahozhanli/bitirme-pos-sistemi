import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Box, Button, Paper, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Snackbar, Alert, useMediaQuery, useTheme, Menu, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useQueryClient } from '@tanstack/react-query';
import StatusChip from '../../../shared/components/ui/StatusChip.jsx';
import PaymentBadge from '../../../shared/components/ui/PaymentBadge.jsx';
import OrderDetailModal from '../../../shared/components/modals/OrderDetailModal.jsx';
import { isOrderPaid } from '../../../shared/utils/orderPayment.js';
import VisibilityIcon from '@mui/icons-material/Visibility';
import '../styles/admin.css';
// Dinamik import kullanıyoruz - Vite uyumluluğu için

//

export default function OrderManagementPage(){
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const [rows,setRows] = useState([]);
  const [allRows,setAllRows] = useState([]);
  const [loading,setLoading] = useState(true);
  const [msg,setMsg] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [snack,setSnack] = useState({open:false, message:'', severity:'success'});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paid, setPaid] = useState('');
  const [sortModel, setSortModel] = useState([]);
  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const searchRef = useRef(null);
  
  // Mobilde bazı kolonları gizle
  const columnVisibilityModel = useMemo(() => ({
    createdAt: !isMobile,
    isPaid: !isMobile,
  }), [isMobile]);

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

  const fetchOrders = async()=>{
    setLoading(true);
    setMsg('');
    try{
      // Token kontrolü
      const token = localStorage.getItem('token');
      if (!token) {
        setMsg('Oturum açmanız gerekiyor. Lütfen giriş yapın.');
        setLoading(false);
        return;
      }

      // Token header'lara eklenmiş olmalı (AuthContext'te), ama yine de kontrol edelim
      if (!axios.defaults.headers.common['Authorization'] && !axios.defaults.headers.common['x-auth-token']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        axios.defaults.headers.common['x-auth-token'] = token;
      }

      const allOrders = [];
      const pageSize = 100;
      let page = 1;
      let total = Infinity;

      while (allOrders.length < total) {
        const { data } = await axios.get('/api/admin/orders', {
          params: { page, limit: pageSize },
        });
        const batch = Array.isArray(data) ? data : (data.items || []);
        total = Number(data?.total ?? batch.length);
        allOrders.push(...batch);
        if (batch.length === 0 || allOrders.length >= total) break;
        page += 1;
      }

      const mapped = allOrders.map(o=>({ id:o._id, ...o }));
      setAllRows(mapped);
      setRows(applyFilters(mapped));
      setMsg('');
    }catch(e){
      console.error('Siparişler yüklenemedi:', e);
      if (e.response?.status === 401) {
        setMsg('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        // Token'ı temizle ve login sayfasına yönlendir
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        const errorMsg = e.response?.data?.message || e.response?.data?.msg || 'Siparişler yüklenemedi.';
        setMsg(errorMsg);
      }
    }finally{ setLoading(false); }
  };

  useEffect(()=>{ 
    try{
      const raw = localStorage.getItem('admin.orderGrid');
      if (raw) {
        const s = JSON.parse(raw);
        setSearch(s.search ?? '');
        // Backward-compat: statusFilter/paidFilter
        setStatus((s.status ?? (s.statusFilter === 'Tümü' ? '' : s.statusFilter)) || '');
        setPaid((s.paid ?? (s.paidFilter === 'Tümü' ? '' : s.paidFilter)) || '');
        setSortModel(s.sortModel ?? []);
        setPaginationModel(s.paginationModel ?? { pageSize:10, page:0 });
      }
    } catch {
      /* localStorage okuma hatası yoksay */
    }
    fetchOrders(); 
  },[]);

  const persistState = (overrides={}) => {
    const payload = {
      search, status, paid, sortModel, paginationModel,
      ...overrides,
    };
    localStorage.setItem('admin.orderGrid', JSON.stringify(payload));
  };

  const applyFilters = (list) => {
    const q = String(search || '').toLowerCase();
    const isPaidOrder = (order) =>
      isOrderPaid(order) || ['tamamlandi', 'PAID', 'SERVED'].includes(order.status);

    return (list || []).filter((order) => {
      const matchesSearch = q
        ? (
            (order.table?.name != null && String(order.table.name).toLowerCase().includes(q)) ||
            (Array.isArray(order.items) && order.items.some(it => String(it?.name || '').toLowerCase().includes(q)))
          )
        : true;
      const matchesStatus = status ? order.status === status : true;
      const matchesPaid = paid
        ? (paid === 'Evet' ? isPaidOrder(order) : !isPaidOrder(order))
        : true;
      return matchesSearch && matchesStatus && matchesPaid;
    });
  };

  useEffect(() => {
    setRows(applyFilters(allRows));
    persistState();
  }, [search, status, paid, allRows]);

  // Listeyi tek kayıt bazlı güncelle
  const mergeUpdated = (updated) => {
    setAllRows(prev => prev.map(o => (o._id === updated._id || o.id === updated._id) ? ({ id: updated._id, ...updated }) : o));
    setRows(prev => prev.map(o => (o._id === updated._id || o.id === updated._id) ? ({ id: updated._id, ...updated }) : o));
    setSelectedOrder(prev => (prev && (prev._id === updated._id || prev.id === updated._id)) ? ({ ...updated }) : prev);
  };

  // Detay aç
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  const handleCancelOrder = async (orderId) => {
    if (!orderId) return;
    if (!window.confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return;
    try {
      const res = await axios.put(
        `/api/admin/orders/${orderId}/cancel`,
        { reason: 'Admin iptali' },
        { headers }
      );
      mergeUpdated(res.data);
      setSnack({ open: true, message: 'Sipariş iptal edildi', severity: 'success' });
    } catch (e) {
      setSnack({
        open: true,
        message: e.response?.data?.message || 'İptal edilemedi',
        severity: 'error',
      });
    }
  };

  // Durum güncelle
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      // optimistic
      const prevAll = allRows;
      const prevRow = prevAll.find(r => (r._id === orderId || r.id === orderId));
      if (prevRow) {
        const optimistic = { ...prevRow, status: newStatus };
        mergeUpdated(optimistic);
      }
      const res = await axios.put(
        `/api/admin/orders/${orderId}/status`,
        { status: newStatus },
        { headers }
      );
      mergeUpdated(res.data);
      setSnack({open:true, message:'Durum güncellendi', severity:'success'});
    } catch(e) {
      await fetchOrders();
      console.error('Durum güncellenemedi:', e);
      setMsg(e.response?.data?.message || 'Durum güncellenemedi.');
      setSnack({open:true, message:(e.response?.data?.message || 'Durum güncellenemedi.'), severity:'error'});
    }
  };

  // Ödendi yap
  const handleMarkAsPaid = async (orderId) => {
    console.log('🔍 handleMarkAsPaid çağrıldı, orderId:', orderId);
    try {
      if (!orderId) {
        console.error('❌ orderId yok!');
        setSnack({open:true, message:'Sipariş ID bulunamadı', severity:'error'});
        return;
      }

      // optimistic
      const prevAll = allRows;
      const prevRow = prevAll.find(r => (r._id === orderId || r.id === orderId));
      if (prevRow) {
        const optimistic = { ...prevRow, status: 'ödendi', paymentStatus: 'paid', paidAt: new Date().toISOString() };
        mergeUpdated(optimistic);
      }
      
      console.log('📤 Backend\'e istek gönderiliyor:', `/api/admin/orders/${orderId}/pay`);
      const res = await axios.put(
        `/api/admin/orders/${orderId}/pay`,
        {},
        { headers }
      );
      console.log('✅ Backend yanıtı:', res.data);
      
      const updated = res.data;
      mergeUpdated(updated);
      
      // KPI verilerini yenile (sipariş ödendi, revenue değişti)
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      
      setSnack({open:true, message:'Ödeme işaretlendi', severity:'success'});
    } catch(e) {
      console.error('❌ Ödeme işaretlenemedi:', e);
      console.error('❌ Hata detayları:', {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        statusText: e.response?.statusText
      });
      await fetchOrders();
      setMsg(e.response?.data?.message || 'Ödeme işaretlenemedi.');
      setSnack({open:true, message:(e.response?.data?.message || 'Ödeme işaretlenemedi.'), severity:'error'});
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
  };

  // Export fonksiyonları
  const getExportData = () => {
    return rows.map(r => ({
      id: r.id || r._id || '',
      tableName: r.table?.name || '',
      total: Number(r.total ?? 0).toFixed(2),
      status: r.status || '',
      odendi: isOrderPaid(r) || r.status === 'tamamlandi' ? 'Evet' : 'Hayır',
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR') : ''
    }));
  };

  const getFileName = (extension) => {
    const date = new Date().toISOString().split('T')[0];
    return `siparisler_${date}.${extension}`;
  };

  const exportToCSV = () => {
    const headersCsv = ['id', 'tableName', 'total', 'status', 'odendi', 'createdAt'];
    const data = getExportData();
    const lines = data.map(r => [
      r.id,
      r.tableName,
      r.total,
      r.status,
      r.odendi,
      r.createdAt
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headersCsv.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFileName('csv');
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuAnchor(null);
  };

  const exportToExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Siparişler');
      
      const data = getExportData();
      
      // Başlıklar
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 20 },
        { header: 'Masa', key: 'tableName', width: 15 },
        { header: 'Toplam', key: 'total', width: 12 },
        { header: 'Durum', key: 'status', width: 15 },
        { header: 'Ödendi', key: 'odendi', width: 12 },
        { header: 'Tarih', key: 'createdAt', width: 20 }
      ];
      
      // Başlık stilini ayarla
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF111111' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      
      // Verileri ekle
      data.forEach(row => {
        worksheet.addRow(row);
      });
      
      // Dosyayı indir
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName('xlsx');
      a.click();
      URL.revokeObjectURL(url);
      
      setExportMenuAnchor(null);
    } catch (error) {
      console.error('Excel export hatası:', error);
      setSnack({open:true, message:'Excel dosyası oluşturulamadı', severity:'error'});
      setExportMenuAnchor(null);
    }
  };

  const exportToPDF = async () => {
    try {
      const [{ default: jsPDF }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      
      const data = getExportData();
      const doc = new jsPDF();
      
      // Başlık
      doc.setFontSize(16);
      doc.text('Sipariş Listesi', 14, 15);
      
      // Tarih
      doc.setFontSize(10);
      doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}`, 14, 22);
      
      // Tablo
      const tableData = data.map(r => [
        String(r.id).slice(-6),
        r.tableName,
        `${r.total} TL`,
        r.status,
        r.odendi,
        r.createdAt
      ]);
      
      doc.autoTable({
        head: [['Sipariş ID', 'Masa', 'Toplam', 'Durum', 'Ödendi', 'Tarih']],
        body: tableData,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [17, 17, 17], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 28 }
      });
      
      doc.save(getFileName('pdf'));
      setExportMenuAnchor(null);
    } catch (error) {
      console.error('PDF export hatası:', error);
      setSnack({open:true, message:'PDF dosyası oluşturulamadı', severity:'error'});
      setExportMenuAnchor(null);
    }
  };

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const cols = [
    { 
      field:'table', 
      headerName:'Masa No', 
      width:90,
      renderCell: (params) => {
        const table = params.value || params.row?.table;
        return table?.name || '—';
      }
    },
    { 
      field:'total', 
      headerName:'Toplam', 
      width:120,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        const price = params.value || params.row?.total || 0;
        return <span className="order-total-cell">{Number(price).toFixed(2)} TL</span>;
      }
    },
    { field:'status', headerName:'Durum', width:160, renderCell:p=><StatusChip status={p.value}/> },
    {
      field: 'paymentStatus',
      headerName: 'Mobil ödeme',
      width: 200,
      sortable: false,
      renderCell: (params) => {
        const row = params.row || {};
        if (row.status === 'iptal' || row.status === 'CANCELED') return '—';
        return <PaymentBadge order={row} />;
      },
    },
    { 
      field:'createdAt', 
      headerName:'Tarih', 
      width:180,
      renderCell: (params) => {
        const date = params.value || params.row?.createdAt;
        return <span className="order-date-cell">{date ? new Date(date).toLocaleString('tr-TR') : '—'}</span>;
      }
    },
    { 
      field:'id', 
      headerName:'Sipariş ID', 
      width:140,
      renderCell: (params) => {
        const id = params.value || params.row?.id || '';
        return <span className="order-id-cell">{id ? `...${String(id).slice(-6)}` : '—'}</span>;
      }
    },
    {
      field: 'actions',
      headerName: '',
      width: 80,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const order = params.row;
        return (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(order);
            }}
            size="small"
            className="order-detail-button"
            sx={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: 'var(--color-brand-green)',
                color: 'var(--color-brand-green)',
              },
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        );
      },
    }
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        fetchOrders();
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSearch(''); setStatus(''); setPaid('');
        persistState({ search:'', status:'', paid:'' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);


  return (
    <Paper sx={{ p: { xs: 'clamp(8px, 2vw, 16px)', sm: 2, md: 3 }, bgcolor: 'background.paper', minHeight: 400 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontSize: 'clamp(18px, 2.5vw, 24px)' }}>
        Sipariş Yönetimi
      </Typography>
      {msg && (
        <Typography color={msg.includes('Hata') || msg.includes('yüklenemedi') ? 'error' : 'info'} sx={{ mb: 2 }}>
          {msg}
        </Typography>
      )}
      {!loading && rows.length === 0 && !msg && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Henüz sipariş bulunmuyor.
        </Typography>
      )}
      {/* Filter Bar */}
      <Box className="order-filter-bar">
        <Box className="order-filter-group">
          <TextField
            inputRef={searchRef}
            label="Ara"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e)=> setSearch(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 200 } }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
            <InputLabel>Durum</InputLabel>
            <Select value={status} onChange={(e)=> setStatus(e.target.value)} label="Durum">
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="hazirlaniyor">Hazırlanıyor</MenuItem>
              <MenuItem value="serviste">Serviste</MenuItem>
              <MenuItem value="ödendi">Ödendi</MenuItem>
              <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
              <MenuItem value="iptal">İptal</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
            <InputLabel>Ödeme Durumu</InputLabel>
            <Select value={paid} onChange={(e)=> setPaid(e.target.value)} label="Ödeme Durumu">
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="Evet">Evet</MenuItem>
              <MenuItem value="Hayır">Hayır</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box className="order-filter-actions">
          {(search || status || paid) && (
            <Button
              variant="text"
              className="order-clear-filters"
              onClick={() => {
                setSearch('');
                setStatus('');
                setPaid('');
                persistState({ search: '', status: '', paid: '' });
              }}
            >
              Filtreleri Temizle
            </Button>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', display: { xs: 'none', sm: 'block' } }}>
            {(search?1:0) + (status?1:0) + (paid?1:0)} filtre aktif
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleExportMenuOpen}
            sx={{ minHeight: '40px', fontSize: '0.875rem' }}
          >
            İndir
          </Button>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportMenuClose}
          >
            <MenuItem onClick={exportToCSV}>CSV olarak indir</MenuItem>
            <MenuItem onClick={exportToExcel}>Excel (.xlsx) olarak indir</MenuItem>
            <MenuItem onClick={exportToPDF}>PDF olarak indir</MenuItem>
          </Menu>
        </Box>
      </Box>

      <Box sx={{ width: '100%', height: { xs: 400, sm: 500, md: 640 } }}>
        <DataGrid
          rows={rows}
          columns={cols}
          loading={loading}
          pageSizeOptions={[10,25,50]}
          sortModel={sortModel}
          onSortModelChange={(m)=>{ setSortModel(m); persistState({ sortModel:m }); }}
          paginationModel={paginationModel}
          onPaginationModelChange={(m)=>{ setPaginationModel(m); persistState({ paginationModel:m }); }}
          columnVisibilityModel={columnVisibilityModel}
          disableRowSelectionOnClick
          autoHeight={false}
          density={isMobile ? 'compact' : 'standard'}
          onRowClick={(params) => handleViewDetails(params.row)}
          localeText={{
            // Pagination
            paginationRowsPerPage: 'Sayfa başına satır:',
            paginationLabelDisplayedRows: ({ from, to, count }) => {
              if (count === -1) {
                return `${from}-${to} / ${to}'den fazla`;
              }
              return `${from}-${to} / ${count}`;
            },
            // Toolbar
            toolbarDensity: 'Yoğunluk',
            toolbarDensityLabel: 'Yoğunluk',
            toolbarDensityCompact: 'Kompakt',
            toolbarDensityStandard: 'Standart',
            toolbarDensityComfortable: 'Rahat',
            // Columns
            columnsManagementSearchTitle: 'Kolon ara',
            columnsManagementNoColumns: 'Kolon yok',
            columnsManagementShowHideAllText: 'Tümünü Göster/Gizle',
            // Filter
            filterPanelAddFilter: 'Filtre Ekle',
            filterPanelDeleteIconLabel: 'Sil',
            filterPanelOperators: 'Operatörler',
            filterPanelOperatorAnd: 'Ve',
            filterPanelOperatorOr: 'Veya',
            filterPanelColumns: 'Kolonlar',
            filterPanelInputLabel: 'Değer',
            filterPanelInputPlaceholder: 'Filtre değeri',
            // No rows
            noRowsLabel: 'Satır yok',
            noResultsOverlayLabel: 'Sonuç bulunamadı',
            // Error
            errorOverlayDefaultLabel: 'Bir hata oluştu',
          }}
          componentsProps={{
            pagination: {
              labelRowsPerPage: 'Sayfa başına satır:',
              labelDisplayedRows: ({ from, to, count }) => {
                if (count === -1) {
                  return `${from}-${to} / ${to}'den fazla`;
                }
                return `${from}-${to} / ${count}`;
              },
            },
          }}
          sx={{
            '& .MuiDataGrid-cell': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            },
            '& .MuiDataGrid-columnHeader': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            },
            '& .MuiDataGrid-row': {
              '&:nth-of-type(even)': {
                backgroundColor: '#fafafa',
              },
              '&:hover': {
                backgroundColor: '#f0f9ff !important',
                cursor: 'pointer',
              },
            },
          }}
        />
      </Box>
      {/* Detay Modal */}
      <OrderDetailModal
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
              order={selectedOrder}
        onMakeReady={(id) => id && handleUpdateStatus(id, 'serviste')}
        onMarkPaid={(id) => id && handleMarkAsPaid(id)}
        onCancelOrder={(id) => id && handleCancelOrder(id)}
            />

      <Snackbar open={snack.open} autoHideDuration={2500} onClose={()=>setSnack({...snack, open:false})} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert elevation={3} severity={snack.severity} onClose={()=>setSnack({...snack, open:false})} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
