import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';

/**
 * Unauthorized - Yetkisiz erişim sayfası
 */
export default function Unauthorized() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const role = state?.role ?? 'bilinmiyor';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        px: 2,
      }}
    >
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
        <Typography variant="h4" gutterBottom color="error">
          Yetkisiz Erişim
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Bu sayfaya erişmek için yeterli yetkiniz bulunmamaktadır.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Mevcut rolünüz: <strong>{role}</strong>
        </Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>
          Giriş Sayfasına Dön
        </Button>
      </Paper>
    </Box>
  );
}

