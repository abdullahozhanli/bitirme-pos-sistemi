import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
} from '@mui/material';
import axios from 'axios';

export default function TableFormModal({ open, onClose, table, onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    capacity: 4,
    status: 'bos',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!table;

  useEffect(() => {
    if (table) {
      setFormData({
        name: table.name || '',
        capacity: table.capacity || 4,
        status: table.status || 'bos',
      });
    } else {
      setFormData({
        name: '',
        capacity: 4,
        status: 'bos',
      });
    }
    setError('');
  }, [table, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      if (isEdit) {
        await axios.put(`/api/admin/tables/${table._id}`, formData, { headers });
      } else {
        await axios.post('/api/admin/tables', formData, { headers });
      }

      onSaved();
    } catch (err) {
      console.error('Masa kaydedilemedi:', err);
      setError(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEdit ? 'Masa Düzenle' : 'Yeni Masa Ekle'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Masa Adı"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              placeholder="Örn: Masa 1"
            />

            <TextField
              label="Kapasite"
              name="capacity"
              type="number"
              value={formData.capacity}
              onChange={handleChange}
              required
              fullWidth
              inputProps={{ min: 1, max: 20 }}
            />

            <FormControl fullWidth>
              <InputLabel>Durum</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Durum"
              >
                <MenuItem value="bos">Müsait</MenuItem>
                <MenuItem value="dolu">Dolu</MenuItem>
                <MenuItem value="rezerve">Rezerve</MenuItem>
                <MenuItem value="odeme_bekliyor">Ödeme Bekliyor</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            İptal
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
















