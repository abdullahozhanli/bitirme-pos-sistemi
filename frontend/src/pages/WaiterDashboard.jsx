import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import PageHeader from '../components/PageHeader.jsx';

/**
 * WaiterDashboard - Garson arayüzü placeholder
 */
export default function WaiterDashboard() {
  return (
    <Box
      sx={{
        flexGrow: 1,
        maxWidth: '100%',
        mx: 'auto',
        px: { xs: 'clamp(12px, 4vw, 24px)', sm: 'clamp(12px, 4vw, 24px)', md: 'clamp(12px, 4vw, 24px)' },
        py: { xs: 'clamp(8px, 2vw, 16px)', sm: 2, md: 3 },
        minW: 0,
        overflowX: 'hidden',
      }}
    >
      <PageHeader title="Garson Paneli" subtitle="Masa yönetimi ve sipariş takibi" />

      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Garson Paneli
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Bu sayfa yakında aktif olacak. Masa yönetimi, sipariş oluşturma ve servis takibi özellikleri eklenecek.
        </Typography>
        <Button variant="contained" disabled>
          Yakında...
        </Button>
      </Paper>
    </Box>
  );
}





