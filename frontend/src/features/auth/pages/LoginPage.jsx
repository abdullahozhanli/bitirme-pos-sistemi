import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import { getApiBaseURL } from '../../../shared/lib/apiBase.js';
import {
  AUTH_BRAND_GREEN,
  AUTH_BRAND_GREEN_DARK,
  AUTH_CARD_BORDER,
  AUTH_INPUT_BG,
  AUTH_INPUT_BORDER,
  AUTH_LOGO_PATH,
  AUTH_PAGE_BG,
  AUTH_TITLE_GREEN,
} from '../authTheme.js';

function homePathForRole(role) {
  if (role === 'superadmin') return '/superadmin';
  if (role === 'admin') return '/admin';
  if (role === 'garson' || role === 'yetkili') return '/waiter';
  if (role === 'mutfak') return '/kitchen';
  if (role === 'kasa') return '/cashier';
  return '/';
}

function AuthField({ icon, ...props }) {
  const Icon = icon;
  return (
    <TextField
      fullWidth
      size="medium"
      {...props}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '20px',
          bgcolor: AUTH_INPUT_BG,
          minHeight: 48,
          pl: 0.5,
          '& fieldset': { borderColor: AUTH_INPUT_BORDER },
          '&:hover fieldset': { borderColor: AUTH_BRAND_GREEN },
          '&.Mui-focused fieldset': { borderColor: AUTH_BRAND_GREEN, borderWidth: 1.5 },
        },
        ...props.sx,
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ ml: 0.5 }}>
            <Icon sx={{ fontSize: 20, color: AUTH_BRAND_GREEN }} />
          </InputAdornment>
        ),
        ...props.InputProps,
      }}
    />
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  // Sadece sayfa ilk açıldığında eski oturumu temizle (logout deps'e bağlanırsa giriş sonrası tekrar çalışır)
  useEffect(() => {
    logout();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      axios.defaults.baseURL = getApiBaseURL();

      const response = await axios.post('/api/auth/login', {
        email: email.trim(),
        password,
      });
      const token = response.data.token;
      const userData = response.data.user;

      if (!token || !userData) {
        setError('Token alınamadı');
        return;
      }
      if (!userData.role) {
        setError('Kullanıcı rol bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      login(token, userData);

      if (userData.passwordMeetsPolicy !== true) {
        navigate('/password-upgrade', { replace: true });
        return;
      }

      navigate(homePathForRole(userData.role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.msg ||
          'Geçersiz giriş bilgileri'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: AUTH_PAGE_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3,
          border: `1px solid ${AUTH_CARD_BORDER}`,
          boxShadow: '0 12px 40px rgba(26, 31, 43, 0.08)',
          bgcolor: '#FFFFFF',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box
            component="img"
            src={AUTH_LOGO_PATH}
            alt="Self Kasa"
            sx={{
              width: '100%',
              maxWidth: 240,
              height: 56,
              objectFit: 'contain',
              mb: 2,
            }}
          />
          <Typography
            component="h1"
            variant="h5"
            align="center"
            sx={{ fontWeight: 700, color: AUTH_TITLE_GREEN, letterSpacing: -0.3 }}
          >
            Yönetim paneline hoş geldiniz
          </Typography>
          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 1, color: '#7A7168', lineHeight: 1.6, maxWidth: 320 }}
          >
            Personel hesabınızla giriş yaparak işletmenizi yönetin.
          </Typography>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleLogin} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <AuthField
            icon={EmailOutlinedIcon}
            required
            id="email"
            name="email"
            label="E-posta adresi"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <AuthField
            icon={LockOutlinedIcon}
            required
            name="password"
            label="Şifre"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? (
                      <VisibilityOffIcon fontSize="small" sx={{ color: '#7A7168' }} />
                    ) : (
                      <VisibilityIcon fontSize="small" sx={{ color: '#7A7168' }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            disabled={loading || !email.trim() || !password}
            sx={{
              mt: 2,
              py: 1.5,
              borderRadius: 999,
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              textTransform: 'none',
              background: `linear-gradient(90deg, ${AUTH_BRAND_GREEN_DARK} 0%, ${AUTH_BRAND_GREEN} 55%, #67C96B 100%)`,
              boxShadow: '0 8px 24px rgba(46, 125, 50, 0.28)',
              '&:hover': {
                background: `linear-gradient(90deg, #256B2E 0%, ${AUTH_BRAND_GREEN_DARK} 55%, ${AUTH_BRAND_GREEN} 100%)`,
                boxShadow: '0 10px 28px rgba(46, 125, 50, 0.32)',
              },
              '&.Mui-disabled': {
                background: '#C5D4C8',
                color: '#fff',
                boxShadow: 'none',
              },
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Giriş yap'}
          </Button>
        </Box>

        <Typography
          variant="caption"
          align="center"
          display="block"
          sx={{ mt: 3, color: '#9CA3AF' }}
        >
          © {new Date().getFullYear()} Self Kasa
        </Typography>
      </Paper>
    </Box>
  );
}
