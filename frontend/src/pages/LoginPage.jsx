import React, { useState } from 'react'; // 'useState'i formlar için tutuyoruz
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Global Giriş Hafızamızı import et (Değişiklik yok)
import { useAuth } from '../context/AuthContext.jsx';

// YENİ: MUI Bileşenlerini (Lego Parçaları) import et
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Alert // YENİ: Hata mesajları için daha şık bir uyarı
} from '@mui/material'; 

export default function LoginPage() {
  // --- MANTIK (LOGIC) KISMI ---
  // (Bu kısımda HİÇBİR değişiklik yok, zaten mükemmel çalışıyor)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // baseURL'in set edildiğinden emin ol
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
      
      // Debug: Response'u kontrol et
      console.log('Login Response:', { token: token ? 'exists' : 'missing', userData });
      
      if (token && userData) {
        // userData'da role bilgisi olmalı
        if (!userData.role) {
          console.error('userData\'da role bilgisi yok!', userData);
          setError('Kullanıcı rol bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
          return;
        }
        
        login(token, userData);
        
        // Role'e göre yönlendir
        if (userData?.role === 'admin') {
          navigate('/admin');
        } else if (userData?.role === 'garson' || userData?.role === 'yetkili') {
          navigate('/waiter/tables');
        } else if (userData?.role === 'mutfak') {
          navigate('/kitchen');
        } else {
          // Diğer rolleri (kasa, musteri vb.) ana sayfaya yönlendir
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

  // --- GÖRÜNÜM (RENDER) KISMI ---
  // (Burası MUI ile baştan yazıldı)
  return (
    // <Container> -> Formu sayfanın ortasına hizalar (max genişlik 'xs' = en küçük)
    <Container component="main" maxWidth="xs"> 
      <Box
        sx={{
          marginTop: 8, // Üstten 8 birim boşluk
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', // Her şeyi ortala
        }}
      >
        <Typography component="h1" variant="h5">
          Admin Paneli Girişi
        </Typography>

        {/* Formumuz (MUI Box bileşeni) */}
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>

          {/* E-posta alanı (Eski <input> yerine) */}
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

          {/* Şifre alanı (Eski <input> yerine) */}
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

          {/* Hata Mesajı (Eski kırmızı <p> yerine) */}
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          {/* Giriş Butonu (Eski <button> yerine) */}
          <Button
            type="submit"
            fullWidth
            variant="contained" // (Dolgulu, ana buton stili)
            sx={{ mt: 3, mb: 2 }} // (Üstten 3, alttan 2 birim boşluk)
          >
            Giriş Yap
          </Button>
        </Box>
      </Box>
    </Container>
  );
}