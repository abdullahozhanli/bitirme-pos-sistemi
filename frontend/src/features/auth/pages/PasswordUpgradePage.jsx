import React, { useState } from 'react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import { Box, Button, Container, TextField, Typography, Alert } from '@mui/material';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../../../shared/utils/passwordPolicy.js';

function homePathForRole(role) {
  if (role === 'superadmin') return '/superadmin';
  if (role === 'admin') return '/admin';
  if (role === 'garson' || role === 'yetkili') return '/waiter';
  if (role === 'mutfak') return '/kitchen';
  if (role === 'kasa') return '/cashier';
  return '/';
}

export default function PasswordUpgradePage() {
  const { user, isAuthenticated, logout, refreshUserFromMe } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.passwordMeetsPolicy === true) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!current.trim() || !next.trim()) {
      setError('Mevcut ve yeni şifreyi girin.');
      return;
    }
    if (!isStrongPassword(next)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (next !== again) {
      setError('Yeni şifre tekrarı eşleşmiyor.');
      return;
    }
    setBusy(true);
    try {
      const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';
      if (!axios.defaults.baseURL) axios.defaults.baseURL = baseURL;
      await axios.post('/api/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      await refreshUserFromMe();
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Şifre güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
        <Typography component="h1" variant="h5" align="center">
          Şifre güncelleme zorunlu
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Güvenlik için şifreniz yeni kurallara uygun olmalı. Mevcut şifrenizi ve yeni güçlü şifrenizi girin.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {PASSWORD_POLICY_MESSAGE}
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="current"
            label="Mevcut şifre"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="next"
            label="Yeni şifre"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="again"
            label="Yeni şifre (tekrar)"
            type="password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={busy}>
            {busy ? 'Kaydediliyor…' : 'Güncelle'}
          </Button>
          <Button fullWidth sx={{ mt: 1 }} onClick={() => logout()}>
            Çıkış
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
