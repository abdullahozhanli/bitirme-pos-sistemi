import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Box, Button, Paper, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Snackbar, Alert, useMediaQuery, useTheme } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import StatusChip from '../components/ui/StatusChip.jsx';
import OrderDetailModal from '../components/OrderDetailModal.jsx';

//

export default function OrderManagementPage(){
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
  const searchRef = useRef(null);
  
  // Mobilde bazı kolonları gizle
  const columnVisibilityModel = useMemo(() => ({
    createdAt: !isMobile,
    isPaid: !isMobile,
  }), [isMobile]);

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

  const normalizeTr = (text) => String(text || '')
    .replace(/İ/g, 'I').replace(/I/g, 'I')
    .replace(/ı/g, 'i').replace(/i/g, 'i')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .toLowerCase();

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

      // Axios baseURL ve token header'ları AuthContext'te otomatik ayarlanmış
      const { data } = await axios.get('/api/admin/orders');
      // Backend { items: [...], page, limit, total, pages } formatında döndürüyor
      const ordersList = Array.isArray(data) ? data : (data.items || []);
      const mapped = ordersList.map(o=>({ id:o._id, ...o }));
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
    }catch{}
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
    return (list || []).filter((order) => {
      const matchesSearch = q
        ? (
            (order.table?.name != null && String(order.table.name).includes(search)) ||
            (Array.isArray(order.items) && order.items.some(it => String(it?.name || '').toLowerCase().includes(q)))
          )
        : true;
      const matchesStatus = status ? order.status === status : true;
      const matchesPaid = paid ? (paid === 'Evet' ? order.status === 'tamamlandi' : order.status !== 'tamamlandi') : true;
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
    try {
      // optimistic
      const prevAll = allRows;
      const prevRow = prevAll.find(r => (r._id === orderId || r.id === orderId));
      if (prevRow) {
        const optimistic = { ...prevRow, status: 'tamamlandi' };
        mergeUpdated(optimistic);
      }
      const res = await axios.put(
        `/api/admin/orders/${orderId}/pay`,
        {},
        { headers }
      );
      const updated = res.data;
      mergeUpdated(updated);
      setSnack({open:true, message:'Ödeme işaretlendi', severity:'success'});
      // Ödeme işaretlendi, sipariş 'tamamlandi' durumuna geçti
      // Ek bir işlem gerekmiyor
    } catch(e) {
      await fetchOrders();
      console.error('Ödeme işaretlenemedi:', e);
      setMsg(e.response?.data?.message || 'Ödeme işaretlenemedi.');
      setSnack({open:true, message:(e.response?.data?.message || 'Ödeme işaretlenemedi.'), severity:'error'});
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
  };

  const cols = [
    { 
      field:'id', 
      headerName:'Sipariş ID', 
      width:140,
      renderCell: (params) => {
        const id = params.value || params.row?.id || '';
        return id ? `...${String(id).slice(-6)}` : '—';
      }
    },
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
      renderCell: (params) => {
        const price = params.value || params.row?.total || 0;
        return `${Number(price).toFixed(2)} TL`;
      }
    },
    { field:'status', headerName:'Durum', width:160, renderCell:p=><StatusChip status={p.value}/> },
    { 
      field:'isPaid', 
      headerName:'Ödendi mi?', 
      width:110,
      renderCell: (params) => {
        const row = params.row || {};
        if (row.status === 'iptal') return '—';
        return row.status === 'tamamlandi' ? 'Evet' : 'Hayır';
      }
    },
    { 
      field:'createdAt', 
      headerName:'Tarih', 
      width:180,
      renderCell: (params) => {
        const date = params.value || params.row?.createdAt;
        return date ? new Date(date).toLocaleString('tr-TR') : '—';
      }
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 140,
      sortable: false,
      renderCell: (params) => {
        const order = params.row;
        return (
          <Button
            onClick={() => handleViewDetails(order)}
            size="small"
            variant="contained"
            sx={{
              bgcolor: '#111',
              color: '#fff',
              textTransform: 'none',
              borderRadius: 3,
              px: 1.5,
              '&:hover': { bgcolor: '#222' },
            }}
          >
            Detay Gör
          </Button>
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
      {/* Filter Bar (no date filters) */}
      <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <TextField
          inputRef={searchRef}
          label="Ara"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e)=> setSearch(e.target.value)}
          sx={{ flexGrow: { xs: 1, sm: 0 }, minWidth: { xs: '100%', sm: 200 } }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
          <InputLabel>Durum</InputLabel>
          <Select value={status} onChange={(e)=> setStatus(e.target.value)} label="Durum">
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="hazirlaniyor">Hazırlanıyor</MenuItem>
            <MenuItem value="serviste">Serviste</MenuItem>
            <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
            <MenuItem value="iptal">İptal</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
          <InputLabel>Ödendi mi?</InputLabel>
          <Select value={paid} onChange={(e)=> setPaid(e.target.value)} label="Ödendi mi?">
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="Evet">Evet</MenuItem>
            <MenuItem value="Hayır">Hayır</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ ml: { xs: 0, sm: 'auto' }, display:'flex', alignItems:'center', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 'clamp(11px, 1.5vw, 14px)' }}>{(search?1:0) + (status?1:0) + (paid?1:0)} filtre</Typography>
          <Button variant="outlined" onClick={() => {
            const headersCsv = ['id','tableName','total','status','odendi','createdAt'];
            const lines = rows.map(r => [
              r.id || r._id,
              r.table?.name ?? '',
              Number(r.total ?? 0).toFixed(2),
              r.status ?? '',
              r.status === 'tamamlandi' ? 'Evet' : 'Hayır',
              r.createdAt ? new Date(r.createdAt).toISOString() : ''
            ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
            const csv = [headersCsv.join(','), ...lines].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'orders.csv';
            a.click();
            URL.revokeObjectURL(url);
          }} sx={{ minHeight: '44px', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>İndir (CSV)</Button>
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
          sx={{
            '& .MuiDataGrid-cell': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            },
            '& .MuiDataGrid-columnHeader': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
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
        onCancelOrder={(id) => id && handleUpdateStatus(id, 'iptal')}
            />

      <Snackbar open={snack.open} autoHideDuration={2500} onClose={()=>setSnack({...snack, open:false})} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert elevation={3} severity={snack.severity} onClose={()=>setSnack({...snack, open:false})} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
