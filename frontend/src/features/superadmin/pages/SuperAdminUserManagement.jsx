import React, { useState, useEffect, useMemo } from 'react';
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
  Avatar,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  Stack,
  Badge,
  Grid,
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
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import FilterListIcon from '@mui/icons-material/FilterList';
import PageHeader from '../../../shared/components/layout/PageHeader.jsx';
import './SuperAdminUserManagement.css';

const ROLES = ['superadmin', 'admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];

const PASSWORD_POLICY_MESSAGE =
  'Şifre en az 8 karakter olmalı; en az bir büyük harf, bir küçük harf, bir rakam ve bir sembol içermelidir.';

function isStrongPassword(value) {
  const s = String(value || '');
  if (s.length < 8) return false;
  if (!/[a-z]/.test(s)) return false;
  if (!/[A-Z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  if (!/[^A-Za-z0-9]/.test(s)) return false;
  return true;
}

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
  // Mode: 'assignment' (default) or 'management'
  const [mode, setMode] = useState('assignment');
  
  // Data
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Selection
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [bulkAssignBranchId, setBulkAssignBranchId] = useState('');
  
  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordShowDialogOpen, setPasswordShowDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUserId, setPasswordUserId] = useState(null);
  
  // Menu anchor
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuUser, setMenuUser] = useState(null);
  
  // Form data
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

  // Filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Branch filter (süper adminler hariç)
    if (branchFilter !== 'all') {
      if (branchFilter === 'unassigned') {
        filtered = filtered.filter(user => {
          // Süper adminler şubeye atanamaz, bu filtreye dahil edilmez
          if (user.role === 'superadmin') return false;
          return !user.branchId || (typeof user.branchId === 'object' && !user.branchId._id);
        });
      } else {
        filtered = filtered.filter(user => {
          // Süper adminler şubeye atanamaz
          if (user.role === 'superadmin') return false;
          const userBranchId = typeof user.branchId === 'object' ? user.branchId?._id : user.branchId;
          return String(userBranchId) === String(branchFilter);
        });
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (statusFilter === 'active') return user.isActive !== false;
        if (statusFilter === 'inactive') return user.isActive === false;
        return true;
      });
    }

    // Sort: superadmins first, then unassigned users, then by name
    filtered.sort((a, b) => {
      // Süper adminler en üstte
      if (a.role === 'superadmin' && b.role !== 'superadmin') return -1;
      if (a.role !== 'superadmin' && b.role === 'superadmin') return 1;
      
      // Süper adminler arasında isme göre sırala
      if (a.role === 'superadmin' && b.role === 'superadmin') {
        const aName = (a.name || a.email || '').toLowerCase();
        const bName = (b.name || b.email || '').toLowerCase();
        return aName.localeCompare(bName);
      }
      
      // Diğer kullanıcılar: atanmamışlar önce
      const aHasBranch = a.branchId && (typeof a.branchId === 'object' ? a.branchId._id : a.branchId);
      const bHasBranch = b.branchId && (typeof b.branchId === 'object' ? b.branchId._id : b.branchId);
      
      if (!aHasBranch && bHasBranch) return -1;
      if (aHasBranch && !bHasBranch) return 1;
      
      // Aynı durumdaysa isme göre sırala
      const aName = (a.name || a.email || '').toLowerCase();
      const bName = (b.name || b.email || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    return filtered;
  }, [users, searchTerm, roleFilter, branchFilter, statusFilter]);

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
        if (!isStrongPassword(submitData.password)) {
          setError(PASSWORD_POLICY_MESSAGE);
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

    if (!isStrongPassword(passwordData.password)) {
      setError(PASSWORD_POLICY_MESSAGE);
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

  // Selection handlers
  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    // Süper adminleri hariç tut (şubeye atanamazlar)
    const assignableUsers = filteredAndSortedUsers.filter(u => u.role !== 'superadmin');
    
    if (selectedUsers.size === assignableUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(assignableUsers.map(u => u._id)));
    }
  };

  // Branch assignment handler
  const handleBranchChange = async (userId, newBranchId) => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const updateData = { branchId: newBranchId || null };
      await axios.put(`/api/superadmin/users/${userId}`, updateData, { headers });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Şube ataması başarısız');
    }
  };

  // Bulk assign handler
  const handleBulkAssign = async () => {
    if (!bulkAssignBranchId || selectedUsers.size === 0) return;

    try {
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const branchId = bulkAssignBranchId === 'unassign' ? null : bulkAssignBranchId;
      
      // Filter out superadmins (they can't be assigned to branches)
      const assignableUserIds = Array.from(selectedUsers).filter(userId => {
        const user = users.find(u => u._id === userId);
        return user && user.role !== 'superadmin';
      });
      
      if (assignableUserIds.length === 0) {
        setError('Seçili kullanıcılar arasında şubeye atanabilir kullanıcı bulunamadı');
        return;
      }
      
      // Update all selected users (excluding superadmins)
      await Promise.all(
        assignableUserIds.map(userId =>
          axios.put(`/api/superadmin/users/${userId}`, { branchId }, { headers })
        )
      );

      setSelectedUsers(new Set());
      setBulkAssignDialogOpen(false);
      setBulkAssignBranchId('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Toplu atama başarısız');
    }
  };

  // Menu handlers
  const handleMenuOpen = (event, user) => {
    setMenuAnchor(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuUser(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="superadmin-user-management">
      <PageHeader 
        title="Kullanıcı Yönetimi"
        subtitle="Sistemdeki tüm kullanıcıları yönetin ve şubelere atayın"
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

      {/* Mode Toggle */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(e, newMode) => newMode && setMode(newMode)}
          size="small"
        >
          <ToggleButton value="assignment">
            <AssignmentIcon sx={{ mr: 1 }} />
            Atama Modu
          </ToggleButton>
          <ToggleButton value="management">
            <SettingsIcon sx={{ mr: 1 }} />
            Yönetim Modu
          </ToggleButton>
        </ToggleButtonGroup>

        {selectedUsers.size > 0 && (
          <Badge badgeContent={selectedUsers.size} color="primary">
            <Button
              variant="outlined"
              startIcon={<AssignmentIcon />}
              onClick={() => setBulkAssignDialogOpen(true)}
            >
              Toplu Ata ({selectedUsers.size})
            </Button>
          </Badge>
        )}
      </Box>

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          {/* Search */}
          <TextField
            size="small"
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250, flex: 1 }}
          />

          {/* Role Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Rol</InputLabel>
            <Select
              value={roleFilter}
              label="Rol"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">Tüm Roller</MenuItem>
              {ROLES.map(role => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Branch Filter */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Şube</InputLabel>
            <Select
              value={branchFilter}
              label="Şube"
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <MenuItem value="all">Tüm Şubeler</MenuItem>
              <MenuItem value="unassigned">Atanmamış</MenuItem>
              {branches.filter(b => b.isActive).map(branch => (
                <MenuItem key={branch._id} value={branch._id}>{branch.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Durum</InputLabel>
            <Select
              value={statusFilter}
              label="Durum"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">Tümü</MenuItem>
              <MenuItem value="active">Aktif</MenuItem>
              <MenuItem value="inactive">Pasif</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {mode === 'assignment' && (
                <TableCell padding="checkbox" width={50}>
                  <Checkbox
                    indeterminate={
                      (() => {
                        const assignableUsers = filteredAndSortedUsers.filter(u => u.role !== 'superadmin');
                        return selectedUsers.size > 0 && selectedUsers.size < assignableUsers.length;
                      })()
                    }
                    checked={
                      (() => {
                        const assignableUsers = filteredAndSortedUsers.filter(u => u.role !== 'superadmin');
                        return assignableUsers.length > 0 && selectedUsers.size === assignableUsers.length;
                      })()
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              <TableCell><strong>Kullanıcı</strong></TableCell>
              <TableCell><strong>Rol</strong></TableCell>
              <TableCell><strong>Şube</strong></TableCell>
              {mode === 'management' && (
                <>
                  <TableCell><strong>Durum</strong></TableCell>
                  <TableCell align="right" width={100}><strong>İşlemler</strong></TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={mode === 'assignment' ? 4 : 5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {searchTerm || roleFilter !== 'all' || branchFilter !== 'all' || statusFilter !== 'all'
                      ? 'Filtrelere uygun kullanıcı bulunamadı'
                      : 'Henüz kullanıcı eklenmemiş'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedUsers.map((user) => {
                const userBranchId = typeof user.branchId === 'object' ? user.branchId?._id : user.branchId;
                const userBranchName = typeof user.branchId === 'object' ? user.branchId?.name : null;
                const isUnassigned = !userBranchId;

                return (
                  <TableRow key={user._id} hover>
                    {mode === 'assignment' && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUsers.has(user._id)}
                          onChange={() => handleSelectUser(user._id)}
                          disabled={user.role === 'superadmin'}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                          {(user.name || user.email || 'U')[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {user.name || user.email || '-'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color="primary" 
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      {user.role === 'superadmin' ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Şubeye atanamaz
                        </Typography>
                      ) : mode === 'assignment' ? (
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                          <Select
                            value={userBranchId || ''}
                            onChange={(e) => handleBranchChange(user._id, e.target.value)}
                            displayEmpty
                            sx={{ 
                              '& .MuiSelect-select': { 
                                py: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }
                            }}
                          >
                            <MenuItem value="">
                              <Chip 
                                label="Atanmamış" 
                                size="small" 
                                color="warning" 
                                variant="outlined"
                              />
                            </MenuItem>
                            {branches.filter(b => b.isActive).map(branch => (
                              <MenuItem key={branch._id} value={branch._id}>
                                {branch.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <Box>
                          {isUnassigned ? (
                            <Chip 
                              label="Atanmamış" 
                              size="small" 
                              color="warning" 
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2">{userBranchName || '-'}</Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    {mode === 'management' && (
                      <>
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
                            onClick={(e) => handleMenuOpen(e, user)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* User Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (menuUser) handleOpenDialog(menuUser);
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1, fontSize: 20 }} />
          Düzenle
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuUser) handleOpenPasswordDialog(menuUser._id);
          handleMenuClose();
        }}>
          <LockResetIcon sx={{ mr: 1, fontSize: 20 }} />
          Şifre Sıfırla
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (menuUser) handleDelete(menuUser._id);
          handleMenuClose();
        }} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          Sil
        </MenuItem>
      </Menu>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onClose={() => setBulkAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Toplu Şube Atama</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedUsers.size} kullanıcıya şube atanacak
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Şube Seçin</InputLabel>
              <Select
                value={bulkAssignBranchId}
                label="Şube Seçin"
                onChange={(e) => setBulkAssignBranchId(e.target.value)}
              >
                <MenuItem value="unassign">Atanmamış (Şube Kaldır)</MenuItem>
                {branches.filter(b => b.isActive).map(branch => (
                  <MenuItem key={branch._id} value={branch._id}>{branch.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAssignDialogOpen(false)}>İptal</Button>
          <Button 
            onClick={handleBulkAssign} 
            variant="contained"
            disabled={!bulkAssignBranchId}
          >
            Ata
          </Button>
        </DialogActions>
      </Dialog>

      {/* Kullanıcı Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth={false}
        PaperProps={{
          sx: {
            maxWidth: '720px',
            width: '100%',
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ p: '20px', pb: '16px', borderBottom: '1px solid', borderColor: 'divider', fontWeight: 600 }}>
          {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
        </DialogTitle>
        <DialogContent 
          className="dialog-content-form" 
          sx={{ 
            p: '20px !important',
            display: 'block !important',
            '& > *': {
              width: '100% !important',
              maxWidth: '100% !important'
            }
          }}
        >
          <Box 
            className="form-stack"
            sx={{ 
              display: 'flex !important',
              flexDirection: 'column !important',
              gap: '16px !important',
              width: '100% !important',
              maxWidth: '100% !important',
              '& > *': {
                width: '100% !important',
                maxWidth: '100% !important',
                flexShrink: 0
              }
            }}
          >
            {/* Ad Soyad */}
            <TextField
              id="user-name"
              name="name"
              label="Ad Soyad"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              helperText="Kullanıcının tam adı"
              FormHelperTextProps={{ sx: { fontSize: '12px', m: '4px 0 0 0', color: '#666' } }}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  height: '44px',
                  borderRadius: '12px'
                }
              }}
            />

            {/* E-posta */}
            <TextField
              id="user-email"
              name="email"
              label="E-posta"
              fullWidth
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingUser}
              helperText={editingUser ? "E-posta değiştirilemez" : "Giriş için kullanılacak"}
              FormHelperTextProps={{ sx: { fontSize: '12px', m: '4px 0 0 0', color: '#666' } }}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  height: '44px',
                  borderRadius: '12px'
                }
              }}
            />

            {/* Rol */}
            <FormControl 
              fullWidth
              sx={{ 
                width: '100% !important',
                maxWidth: '100% !important'
              }}
            >
              <InputLabel id="user-role-label">Rol</InputLabel>
              <Select
                id="user-role"
                name="role"
                labelId="user-role-label"
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
                sx={{ 
                  height: '44px',
                  borderRadius: '12px',
                  '& .MuiSelect-select': {
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center'
                  }
                }}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Şube */}
            {formData.role !== 'superadmin' && (
              <FormControl 
                fullWidth
                sx={{ 
                  width: '100% !important',
                  maxWidth: '100% !important'
                }}
              >
                <InputLabel id="user-branch-label">Şube</InputLabel>
                <Select
                  id="user-branch"
                  name="branchId"
                  labelId="user-branch-label"
                  value={formData.branchId}
                  label="Şube"
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  sx={{ 
                    height: '44px',
                    borderRadius: '12px',
                    '& .MuiSelect-select': {
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center'
                    }
                  }}
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

            {/* Password Section */}
            {!editingUser && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <Typography variant="caption" sx={{ fontSize: '12px', color: '#666', flex: 1 }}>
                    {autoGeneratePassword ? 'Güvenli şifre otomatik oluşturulacak' : PASSWORD_POLICY_MESSAGE}
                  </Typography>
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
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                        Otomatik şifre oluştur
                      </Typography>
                    }
                    sx={{ margin: 0 }}
                  />
                </Box>
                
                {autoGeneratePassword ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleGeneratePassword}
                    startIcon={<RefreshIcon />}
                    sx={{ 
                      height: '44px',
                      borderRadius: '12px'
                    }}
                  >
                    Şifre Üret
                  </Button>
                ) : (
                  <TextField
                    id="user-password"
                    name="password"
                    label="Şifre"
                    fullWidth
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Şifre girin"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            aria-label="Şifreyi göster/gizle"
                          >
                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        height: '44px',
                        borderRadius: '12px'
                      }
                    }}
                  />
                )}
              </Box>
            )}

            {/* Aktif Switch */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  Aktif kullanıcı
                </Typography>
              }
              sx={{ margin: 0, width: 'fit-content' }}
            />
          </Box>
        </DialogContent>
        <DialogActions className="dialog-footer">
          <Button 
            onClick={handleCloseDialog}
            variant="text"
            className="footer-button-cancel"
          >
            İptal
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.email || (!editingUser && !autoGeneratePassword && !formData.password)}
            className="footer-button-submit"
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


