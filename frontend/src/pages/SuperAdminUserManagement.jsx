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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import PageHeader from '../components/PageHeader.jsx';

const ROLES = ['superadmin', 'admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];

export default function SuperAdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUserId, setPasswordUserId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'garson',
    branchId: '',
    isActive: true,
  });
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const [usersRes, branchesRes] = await Promise.all([
        axios.get('/api/superadmin/users', { headers }),
        axios.get('/api/superadmin/branches', { headers }),
      ]);

      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
      setError(err.response?.data?.message || 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email || '',
        password: '',
        name: user.name || '',
        role: user.role || 'garson',
        branchId: user.branchId?._id || user.branchId || '',
        isActive: user.isActive !== undefined ? user.isActive : true,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'garson',
        branchId: '',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'garson',
      branchId: '',
      isActive: true,
    });
  };

  const handleOpenPasswordDialog = (userId) => {
    setPasswordUserId(userId);
    setPasswordData({ password: '', confirmPassword: '' });
    setPasswordDialogOpen(true);
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordUserId(null);
    setPasswordData({ password: '', confirmPassword: '' });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const submitData = { ...formData };
      // Süper admin ise branchId null olmalı
      if (submitData.role === 'superadmin') {
        submitData.branchId = null;
      }
      // Şifre yoksa gönderme (güncelleme için)
      if (!submitData.password && editingUser) {
        delete submitData.password;
      }

      if (editingUser) {
        await axios.put(`/api/superadmin/users/${editingUser._id}`, submitData, { headers });
      } else {
        if (!submitData.password) {
          setError('Yeni kullanıcı için şifre zorunludur');
          return;
        }
        await axios.post('/api/superadmin/users', submitData, { headers });
      }

      handleCloseDialog();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.password !== passwordData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (passwordData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      await axios.post(
        `/api/superadmin/users/${passwordUserId}/reset-password`,
        { password: passwordData.password },
        { headers }
      );

      handleClosePasswordDialog();
      alert('Şifre başarıyla güncellendi');
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz?')) {
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      await axios.delete(`/api/superadmin/users/${userId}`, { headers });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
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
        title="Kullanıcı Yönetimi"
        subtitle="Sistemdeki tüm kullanıcıları yönetin"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Yeni Kullanıcı
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Ad</strong></TableCell>
              <TableCell><strong>E-posta</strong></TableCell>
              <TableCell><strong>Rol</strong></TableCell>
              <TableCell><strong>Şube</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell align="right"><strong>İşlemler</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    Henüz kullanıcı eklenmemiş
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip label={user.role} color="primary" size="small" />
                  </TableCell>
                  <TableCell>{user.branchId?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'Aktif' : 'Pasif'}
                      color={user.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(user)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenPasswordDialog(user._id)}
                      color="warning"
                      title="Şifre Sıfırla"
                    >
                      <LockResetIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(user._id)}
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

      {/* Kullanıcı Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="E-posta"
              fullWidth
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingUser}
            />
            {!editingUser && (
              <TextField
                label="Şifre"
                fullWidth
                required
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            )}
            <TextField
              label="Ad"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select
                value={formData.role}
                label="Rol"
                onChange={(e) => {
                  const newRole = e.target.value;
                  setFormData({ 
                    ...formData, 
                    role: newRole,
                    branchId: newRole === 'superadmin' ? '' : formData.branchId
                  });
                }}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formData.role !== 'superadmin' && (
              <FormControl fullWidth>
                <InputLabel>Şube</InputLabel>
                <Select
                  value={formData.branchId}
                  label="Şube"
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                >
                  <MenuItem value="">Şube Seçin</MenuItem>
                  {branches
                    .filter(b => b.isActive)
                    .map((branch) => (
                      <MenuItem key={branch._id} value={branch._id}>
                        {branch.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
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
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.email || (!editingUser && !formData.password)}>
            {editingUser ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Şifre Sıfırlama Dialog */}
      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Şifre Sıfırla</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Yeni Şifre"
              fullWidth
              required
              type="password"
              value={passwordData.password}
              onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
            />
            <TextField
              label="Şifre Tekrar"
              fullWidth
              required
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog}>İptal</Button>
          <Button onClick={handlePasswordSubmit} variant="contained" disabled={!passwordData.password || !passwordData.confirmPassword}>
            Güncelle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

