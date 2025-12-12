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
  InputAdornment,
  Tooltip,
  alpha,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PageHeader from '../../../shared/components/layout/PageHeader.jsx';

const ROLES = ['superadmin', 'admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];

// Güvenli şifre üretme fonksiyonu
const generateSecurePassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%&*+-=?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  // En az bir karakter her kategoriden olsun
  let password = 
    lowercase[Math.floor(Math.random() * lowercase.length)] +
    uppercase[Math.floor(Math.random() * uppercase.length)] +
    numbers[Math.floor(Math.random() * numbers.length)] +
    symbols[Math.floor(Math.random() * symbols.length)];
  
  // Kalan karakterleri rastgele ekle
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Karakterleri karıştır
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default function SuperAdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordShowDialogOpen, setPasswordShowDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [copied, setCopied] = useState(false);
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
      setAutoGeneratePassword(false);
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
      setAutoGeneratePassword(true);
      const newPassword = generateSecurePassword();
      setFormData({
        email: '',
        password: newPassword,
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
    setAutoGeneratePassword(true);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'garson',
      branchId: '',
      isActive: true,
    });
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setFormData({ ...formData, password: newPassword });
  };

  const handleCopyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Şifre kopyalanamadı:', err);
    }
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

      // Otomatik şifre üretimi seçiliyse ve yeni kullanıcıysa
      if (autoGeneratePassword && !editingUser && !submitData.password) {
        submitData.password = generateSecurePassword();
      }

      let response;
      if (editingUser) {
        await axios.put(`/api/superadmin/users/${editingUser._id}`, submitData, { headers });
        handleCloseDialog();
        fetchData();
      } else {
        if (!submitData.password) {
          setError('Yeni kullanıcı için şifre zorunludur');
          return;
        }
        response = await axios.post('/api/superadmin/users', submitData, { headers });
        
        // Yeni kullanıcı oluşturulduğunda şifreyi göster
        if (autoGeneratePassword) {
          setGeneratedPassword(submitData.password);
          setPasswordShowDialogOpen(true);
          handleCloseDialog();
        } else {
          handleCloseDialog();
        }
        fetchData();
      }
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
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoGeneratePassword}
                      onChange={(e) => {
                        setAutoGeneratePassword(e.target.checked);
                        if (e.target.checked) {
                          setFormData({ ...formData, password: generateSecurePassword() });
                        } else {
                          setFormData({ ...formData, password: '' });
                        }
                      }}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Otomatik Güvenli Şifre Oluştur
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Güçlü ve güvenli bir şifre otomatik oluşturulacak
                      </Typography>
                    </Box>
                  }
                />
                <TextField
                  label="Şifre"
                  fullWidth
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={autoGeneratePassword}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {autoGeneratePassword && (
                            <Tooltip title="Yeni Şifre Oluştur">
                              <IconButton
                                size="small"
                                onClick={handleGeneratePassword}
                                sx={{ color: 'primary.main' }}
                              >
                                <RefreshIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title={showPassword ? 'Gizle' : 'Göster'}>
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mt: 1 }}
                  helperText={
                    autoGeneratePassword 
                      ? 'Bu şifre kullanıcı oluşturulduktan sonra size gösterilecek'
                      : 'Manuel olarak şifre girin veya otomatik oluşturmayı açın'
                  }
                />
              </Box>
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
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={!formData.email || (!editingUser && !autoGeneratePassword && !formData.password)}
          >
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

      {/* Oluşturulan Şifreyi Gösterme Dialog */}
      <Dialog 
        open={passwordShowDialogOpen} 
        onClose={() => setPasswordShowDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            background: 'linear-gradient(135deg, #1B873F 0%, #157634 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
            }}
          >
            <VpnKeyIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Kullanıcı Başarıyla Oluşturuldu!
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '13px' }}>
              Lütfen şifreyi kaydedin - sadece bir kez gösterilecek
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ mt: 3 }}>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Önemli Uyarı
            </Typography>
            <Typography variant="body2">
              Bu şifreyi güvenli bir yere kaydedin. Şifre daha sonra görüntülenemez. 
              Şifre sıfırlama özelliğini kullanarak kullanıcı şifresini değiştirebilirsiniz.
            </Typography>
          </Alert>

          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%)',
              border: '2px solid #1B873F',
              mb: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
              Oluşturulan Şifre:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  flex: 1,
                  wordBreak: 'break-all',
                  color: '#1A1A1A',
                }}
              >
                {generatedPassword}
              </Typography>
              <Tooltip title={copied ? 'Kopyalandı!' : 'Kopyala'}>
                <IconButton
                  onClick={() => handleCopyPassword(generatedPassword)}
                  sx={{
                    background: copied ? '#1B873F' : 'white',
                    color: copied ? 'white' : '#1B873F',
                    border: '2px solid #1B873F',
                    '&:hover': {
                      background: copied ? '#157634' : '#f5f7fa',
                    },
                  }}
                >
                  {copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background: alpha('#1B873F', 0.08),
              border: `1px solid ${alpha('#1B873F', 0.2)}`,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#1B873F' }}>
              Şifre Özellikleri:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label={`${generatedPassword.length} karakter`} size="small" />
              <Chip label="Büyük harf" size="small" />
              <Chip label="Küçük harf" size="small" />
              <Chip label="Rakam" size="small" />
              <Chip label="Özel karakter" size="small" />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => handleCopyPassword(generatedPassword)}
            startIcon={copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
            sx={{
              borderRadius: 2,
              px: 3,
              border: '2px solid #1B873F',
              color: '#1B873F',
              '&:hover': {
                background: alpha('#1B873F', 0.08),
              },
            }}
          >
            {copied ? 'Kopyalandı!' : 'Şifreyi Kopyala'}
          </Button>
          <Button
            onClick={() => setPasswordShowDialogOpen(false)}
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 3,
              background: 'linear-gradient(135deg, #1B873F 0%, #157634 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #157634 0%, #0F5C2A 100%)',
              },
            }}
          >
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


