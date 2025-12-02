import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, CircularProgress, Alert, TextField, IconButton, Snackbar } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeIcon from '@mui/icons-material/QrCode';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function QRCodeManagementPage() {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, qrCode: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // QR kodları veritabanından çek
  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      const response = await axios.get('/api/admin/qr', { headers });
      setQrCodes(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('QR kodları yükleme hatası:', err);
      setError(err.response?.data?.message || 'QR kodları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, []);

  // QR kod oluştur
  const generateQR = async (tableNum) => {
    try {
      setGenerating(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      await axios.post('/api/admin/qr', { tableNumber: tableNum }, { headers });
      
      setTableNumber('');
      setSnackbar({ 
        open: true, 
        message: `QR kod ve masa başarıyla oluşturuldu (Masa ${tableNum})`, 
        severity: 'success' 
      });
      
      // QR kodları yeniden çek
      await fetchQRCodes();
    } catch (err) {
      console.error('QR kod oluşturma hatası:', err);
      const errorMsg = err.response?.data?.message || 'QR kod oluşturulamadı';
      setError(errorMsg);
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
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
      generateQR(tableNumber.trim());
    }
  };

  return (
    <Box>
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
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '200px' }}>
              <TextField
                label="Masa Numarası"
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Örn: 5"
                variant="outlined"
                size="small"
                sx={{ flex: 1, maxWidth: '200px' }}
                inputProps={{ min: 1 }}
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<QrCodeIcon />}
                disabled={generating || !tableNumber.trim()}
              >
                {generating ? 'Oluşturuluyor...' : 'QR Kod Oluştur'}
              </Button>
            </form>
          </Box>
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

