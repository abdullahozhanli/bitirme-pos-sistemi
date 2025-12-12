import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import axios from 'axios';

export default function TableSelectModal({ open, onClose, onSelectTable }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchAvailableTables();
    }
  }, [open]);

  const fetchAvailableTables = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const response = await axios.get('/api/waiter/tables', { headers });
      const tablesData = Array.isArray(response.data) ? response.data : [];
      
      // Sadece müsait masaları filtrele
      const availableTables = tablesData.filter(table => table.status === 'bos');
      
      setTables(availableTables);
    } catch (err) {
      console.error('Masalar yüklenemedi:', err);
      setError(err.response?.data?.message || 'Masalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (table) => {
    onSelectTable(table);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableRestaurantIcon />
          <Typography variant="h6" component="span">
            Masa Seçin
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Sipariş almak için müsait bir masa seçin
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : tables.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <TableRestaurantIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3, color: 'text.secondary' }} />
            <Typography variant="body1" color="text.secondary">
              Müsait masa bulunmuyor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tüm masalar dolu veya rezerve edilmiş durumda
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {tables.map((table) => (
              <Grid item xs={12} sm={6} md={4} key={table._id || table.id}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                      borderColor: 'primary.dark',
                    },
                  }}
                  onClick={() => handleTableSelect(table)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TableRestaurantIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {table.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {table.capacity} Kişilik
                    </Typography>
                  </Box>
                  <Chip
                    label="Müsait"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          İptal
        </Button>
      </DialogActions>
    </Dialog>
  );
}

