import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PageHeader from '../../../shared/components/layout/PageHeader.jsx';

export default function SuperAdminBranchManagement() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isActive: true,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const response = await axios.get('/api/superadmin/branches', { headers });
      setBranches(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Şubeler yüklenemedi:', err);
      setError(err.response?.data?.message || 'Şubeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name || '',
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        isActive: branch.isActive !== undefined ? branch.isActive : true,
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBranch(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      if (editingBranch) {
        await axios.put(`/api/superadmin/branches/${editingBranch._id}`, formData, { headers });
      } else {
        await axios.post('/api/superadmin/branches', formData, { headers });
      }

      handleCloseDialog();
      fetchBranches();
      setSuccess(editingBranch ? 'Şube güncellendi.' : 'Şube oluşturuldu.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDelete = async (branchId) => {
    const branchToDelete = branches.find(b => b._id === branchId);
    const branchName = branchToDelete?.name || 'Bu şube';
    
    if (!window.confirm(`${branchName} şubesini kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const response = await axios.delete(`/api/superadmin/branches/${branchId}`, { headers });
      
      if (response.data.message) {
        setSuccess(response.data.message);
      }
      
      fetchBranches();
      
      // Başarı mesajını 3 saniye sonra temizle
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'İşlem başarısız';
      const errorDetails = err.response?.data?.details;
      
      let fullErrorMessage = errorMessage;
      if (errorDetails) {
        const detailsText = Object.entries(errorDetails)
          .filter(([, count]) => count > 0)
          .map(([key, count]) => `${key}: ${count} adet`)
          .join(', ');
        if (detailsText) {
          fullErrorMessage += `\n\nİlişkili veriler: ${detailsText}`;
        }
      }
      
      setError(fullErrorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader 
        title="Şube Yönetimi"
        subtitle="Sistemdeki tüm şubeleri yönetin"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Yeni Şube
          </Button>
        }
      />

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Şube Adı</strong></TableCell>
              <TableCell><strong>Adres</strong></TableCell>
              <TableCell><strong>Telefon</strong></TableCell>
              <TableCell><strong>E-posta</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell align="right"><strong>İşlemler</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    Henüz şube eklenmemiş
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              branches.map((branch) => (
                <TableRow key={branch._id}>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.address || '-'}</TableCell>
                  <TableCell>{branch.phone || '-'}</TableCell>
                  <TableCell>{branch.email || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={branch.isActive ? 'Aktif' : 'Pasif'}
                      color={branch.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(branch)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(branch._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingBranch ? 'Şube Düzenle' : 'Yeni Şube Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Şube Adı"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Adres"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <TextField
              label="Telefon"
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              label="E-posta"
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Aktif"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
            {editingBranch ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


