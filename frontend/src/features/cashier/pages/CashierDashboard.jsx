import React from 'react';
import { Container, Typography, Box } from '@mui/material';

export default function CashierDashboard() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Kasa Ekranı
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ödeme bekleyen masalar ve ödeme işlemleri burada görüntülenecek.
        </Typography>
      </Box>
    </Container>
  );
}

