import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, CircularProgress, Alert, TextField, IconButton, Snackbar } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeIcon from '@mui/icons-material/QrCode';
import axios from 'axios';
import PageHeader from '../../../shared/components/layout/PageHeader.jsx';
import ConfirmDialog from '../../../shared/components/ui/ConfirmDialog.jsx';
import '../styles/admin.css';

export default function QRCodeManagementPage() {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, qrCode: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const isMounted = useRef(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // QR kodları veritabanından çek
  const fetchQRCodes = async () => {
    try {
      // Token kontrolü
      const token = localStorage.getItem('token');
      if (!token) return;

      if (isMounted.current) setLoading(true);
      setError('');

      console.log('🌍 [FRONTEND] İstek atılan adres:', `${API_URL}/api/admin/qr`);

      const headers = { Authorization: `Bearer ${token}`, 'x-auth-token': token };
      
      // DİKKAT: Başına API_URL ekledik
      const response = await axios.get(`${API_URL}/api/admin/qr?t=${new Date().getTime()}`, { headers });
      
      if (isMounted.current) {
        const qrCodesData = Array.isArray(response.data) ? response.data : [];
        console.log('✅ [FRONTEND] Veri geldi:', qrCodesData.length);
        setQrCodes(qrCodesData);
      }
    } catch (err) {
      console.error('❌ Hata:', err);
      if (isMounted.current) {
        // Hata detayını görmek için bunu açın
        console.log('Hata Detayı:', err.response);
        setError(err.response?.data?.message || 'Veri çekilemedi');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // Sayfa açıldığında verileri çek
  useEffect(() => {
    fetchQRCodes();
  }, []);

  // QR kod oluştur
  const generateQR = async (tableNum, tableCapacity) => {
    try {
      setGenerating(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      // Capacity'yi number'a çevir ve kontrol et
      const capacityNum = tableCapacity ? Number(tableCapacity) : 4;
      console.log('🔍 [FRONTEND] QR oluşturuluyor:', {
        tableNum,
        tableCapacity,
        capacityNum,
        tableCapacityType: typeof tableCapacity,
        capacityNumType: typeof capacityNum
      });
      if (isNaN(capacityNum) || capacityNum < 1) {
        setError('Geçerli bir kişi sayısı girin (en az 1)');
        setSnackbar({ open: true, message: 'Geçerli bir kişi sayısı girin (en az 1)', severity: 'error' });
        setGenerating(false);
        return;
      }

      const response = await axios.post('/api/admin/qr', {
        tableNumber: tableNum,
        capacity: capacityNum
      }, { headers });

      console.log('✅ [FRONTEND] QR oluşturuldu, response:', {
        tableNumber: response.data?.tableNumber,
        tableId: response.data?.tableId,
        capacity: response.data?.tableId?.capacity,
        fullResponse: response.data
      });

      setTableNumber('');
      setCapacity('');
      setSnackbar({
        open: true,
        message: `QR kod ve masa başarıyla oluşturuldu (Masa ${tableNum}, ${capacityNum} kişilik)`,
        severity: 'success'
      });

      // QR kodları yeniden çek
      await fetchQRCodes();
    } catch (err) {
      console.error('QR kod oluşturma hatası:', err);
      const errorMsg = err.response?.data?.message || 'QR kod oluşturulamadı';

      // Eğer masa için zaten QR varsa, hata yerine mevcut durumu göster ve listeyi yenile
      if (errorMsg.includes('Bu masa için QR kod zaten mevcut')) {
        setError('');
        setSnackbar({
          open: true,
          message: errorMsg,
          severity: 'info'
        });
        await fetchQRCodes();
      } else {
        setError(errorMsg);
        setSnackbar({ open: true, message: errorMsg, severity: 'error' });
      }
    } finally {
      setGenerating(false);
    }
  };

  // QR kod indir
  const downloadQR = async (tableNum) => {
    try {
      const response = await axios.get(`/api/qr/generate/${tableNum}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `qr-table-${tableNum}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('QR kod indirme hatası:', err);
      setError('QR kod indirilemedi');
    }
  };

  // QR kod sil
  const handleDeleteQR = async () => {
    if (!deleteDialog.qrCode) return;

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      await axios.delete(`/api/admin/qr/${deleteDialog.qrCode._id}`, { headers });

      setSnackbar({
        open: true,
        message: `QR kod ve masa başarıyla silindi (Masa ${deleteDialog.qrCode.tableNumber})`,
        severity: 'success'
      });

      setDeleteDialog({ open: false, qrCode: null });

      // QR kodları yeniden çek
      await fetchQRCodes();
    } catch (err) {
      console.error('QR kod silme hatası:', err);
      const errorMsg = err.response?.data?.message || 'QR kod silinemedi';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
      setDeleteDialog({ open: false, qrCode: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tableNumber.trim()) {
      const capacityValue = capacity.trim() || '4'; // Boşsa varsayılan 4
      generateQR(tableNumber.trim(), capacityValue);
    }
  };

  return (
    <Box className="qr-management-page">
      <PageHeader
        title="QR Kod Yönetimi"
        subtitle="Masalar için QR kod oluşturun ve indirin"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* QR Kod Oluşturma Formu */}
      <Card className="qr-creation-panel" sx={{ mb: 4, borderRadius: 2, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Input Fields - Yan Yana */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Masa Numarası"
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Örn: 12"
                  variant="outlined"
                  fullWidth
                  sx={{
                    flex: 1,
                    minWidth: '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                  inputProps={{ min: 1 }}
                />
                <TextField
                  label="Kişi Sayısı"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Örn: 6"
                  variant="outlined"
                  fullWidth
                  sx={{
                    flex: 1,
                    minWidth: '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                  inputProps={{ min: 1 }}
                  helperText={capacity ? '' : 'Boş bırakılırsa varsayılan 4 kişi'}
                />
              </Box>

              {/* Button - Altında, Full Width */}
              <Button
                type="submit"
                variant="contained"
                startIcon={<QrCodeIcon />}
                disabled={generating || !tableNumber.trim()}
                fullWidth
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                  }
                }}
              >
                {generating ? 'Oluşturuluyor...' : 'QR Kod Oluştur'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* QR Kod Listesi */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      ) : qrCodes.length > 0 ? (
        <Grid container spacing={3}>
          {qrCodes.map((qr) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={qr._id || qr.tableNumber}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Silme Butonu */}
                <IconButton
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' }
                  }}
                  size="small"
                  onClick={() => setDeleteDialog({ open: true, qrCode: qr })}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>

                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Masa {qr.tableNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {(() => {
                      const capacity = qr.tableId?.capacity;
                      console.log(`🔍 [FRONTEND] Masa ${qr.tableNumber} capacity:`, {
                        capacity,
                        capacityType: typeof capacity,
                        tableId: qr.tableId,
                        fullQr: qr
                      });
                      if (capacity !== undefined && capacity !== null && capacity !== '') {
                        return `${capacity} Kişilik`;
                      }
                      return '4 Kişilik (Varsayılan)';
                    })()}
                  </Typography>

                  {qr.qrCode && (
                    <Box
                      component="img"
                      src={qr.qrCode}
                      alt={`QR Code for Table ${qr.tableNumber}`}
                      sx={{
                        width: '100%',
                        maxWidth: '250px',
                        height: 'auto',
                        mb: 2,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        p: 1,
                        bgcolor: '#fff',
                      }}
                    />
                  )}

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      wordBreak: 'break-all',
                      textAlign: 'center',
                      fontSize: '0.75rem'
                    }}
                  >
                    {qr.qrUrl}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadQR(qr.tableNumber)}
                      size="small"
                    >
                      İndir
                    </Button>
                  </Box>

                  {qr.createdAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontSize: '0.7rem' }}>
                      {new Date(qr.createdAt).toLocaleDateString('tr-TR')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <QrCodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Henüz QR kod oluşturulmadı
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Yukarıdaki formu kullanarak masa için QR kod oluşturun. QR kod oluşturulduğunda otomatik olarak masa da oluşturulur.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Silme Onay Dialog'u */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="QR Kod Sil"
        description={`Masa ${deleteDialog.qrCode?.tableNumber} için QR kod ve masa silinecek. Bu işlem geri alınamaz.\n\nMasada aktif sipariş varsa silme işlemi yapılamaz.`}
        onClose={() => setDeleteDialog({ open: false, qrCode: null })}
        onConfirm={handleDeleteQR}
        confirmText="Sil"
        cancelText="Vazgeç"
      />

      {/* Snackbar - Başarı/Hata Mesajları */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

