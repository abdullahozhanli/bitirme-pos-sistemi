import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, CircularProgress, Alert, TextField, IconButton } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import QrCodeIcon from '@mui/icons-material/QrCode';
import axios from 'axios';
import PageHeader from '../components/PageHeader';

export default function QRCodeManagementPage() {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [generating, setGenerating] = useState(false);

  // QR kod oluştur
  const generateQR = async (tableNum) => {
    try {
      setGenerating(true);
      setError('');
      
      const response = await axios.get(`/api/qr/generate/${tableNum}/json`);
      
      const newQR = {
        tableNumber: tableNum,
        qrUrl: response.data.qrUrl,
        qrCode: response.data.qrCode,
      };
      
      setQrCodes(prev => {
        const exists = prev.find(qr => qr.tableNumber === tableNum);
        if (exists) {
          return prev.map(qr => qr.tableNumber === tableNum ? newQR : qr);
        }
        return [...prev, newQR];
      });
      
      setTableNumber('');
    } catch (err) {
      console.error('QR kod oluşturma hatası:', err);
      setError(err.response?.data?.message || 'QR kod oluşturulamadı');
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

  // Tüm masalar için QR kod oluştur (1-20 arası)
  const generateAllQRs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const promises = [];
      for (let i = 1; i <= 20; i++) {
        promises.push(
          axios.get(`/api/qr/generate/${i}/json`)
            .then(res => ({
              tableNumber: String(i),
              qrUrl: res.data.qrUrl,
              qrCode: res.data.qrCode,
            }))
            .catch(err => {
              console.error(`Masa ${i} QR kodu oluşturulamadı:`, err);
              return null;
            })
        );
      }
      
      const results = await Promise.all(promises);
      setQrCodes(results.filter(qr => qr !== null));
    } catch (err) {
      console.error('Toplu QR kod oluşturma hatası:', err);
      setError('QR kodlar oluşturulamadı');
    } finally {
      setLoading(false);
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
            <Button
              variant="outlined"
              onClick={generateAllQRs}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <QrCodeIcon />}
            >
              {loading ? 'Oluşturuluyor...' : 'Tüm Masalar (1-20)'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* QR Kod Listesi */}
      {qrCodes.length > 0 ? (
        <Grid container spacing={3}>
          {qrCodes.map((qr) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={qr.tableNumber}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                  
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadQR(qr.tableNumber)}
                    size="small"
                  >
                    İndir
                  </Button>
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
                Yukarıdaki formu kullanarak masa için QR kod oluşturun
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

