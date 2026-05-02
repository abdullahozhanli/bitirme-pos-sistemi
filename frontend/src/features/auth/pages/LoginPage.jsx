import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../shared/context/AuthContext.jsx';

import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Alert
} from '@mui/material'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  useEffect(() => {
    logout();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';
      if (!axios.defaults.baseURL) {
        axios.defaults.baseURL = baseURL;
      }
      
      const response = await axios.post('/api/auth/login', {
        email: email,
        password: password,
      });
      const token = response.data.token;
      const userData = response.data.user;
      
      console.log('Login Response:', { token: token ? 'exists' : 'missing', userData });
      
      if (token && userData) {
        if (!userData.role) {
          console.error('userData\'da role bilgisi yok!', userData);
          setError('Kullanıcı rol bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
          return;
        }
        
        login(token, userData);
        
        if (userData?.role === 'superadmin') {
          navigate('/superadmin');
        } else if (userData?.role === 'admin') {
          navigate('/admin');
        } else if (userData?.role === 'garson' || userData?.role === 'yetkili') {
          navigate('/waiter');
        } else if (userData?.role === 'mutfak') {
          navigate('/kitchen');
        } else if (userData?.role === 'kasa') {
          navigate('/cashier');
        } else {
          navigate('/');
        }
      } else {
        setError('Token alınamadı');
      }
    } catch (error) {
      console.error('Giriş hatası:', error.response?.data?.message || error.response?.data?.msg);
      setError(error.response?.data?.message || error.response?.data?.msg || 'Geçersiz giriş bilgileri');
    }
  };

  return (
    <Container component="main" maxWidth="xs"> 
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Admin Paneli Girişi
        </Typography>

        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="E-posta Adresi"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Şifre"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Giriş Yap
          </Button>
        </Box>
      </Box>
    </Container>
  );
}








