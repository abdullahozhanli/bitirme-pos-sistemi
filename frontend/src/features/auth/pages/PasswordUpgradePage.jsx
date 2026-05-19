import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import {
  getPasswordChecks,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from '../../../shared/utils/passwordPolicy.js';
import {
  AUTH_BRAND_GREEN,
  AUTH_BRAND_GREEN_DARK,
  AUTH_CARD_BORDER,
  AUTH_INPUT_BG,
  AUTH_LOGO_PATH,
  AUTH_PAGE_BG,
} from '../authTheme.js';

const BRAND_GREEN = AUTH_BRAND_GREEN;
const BRAND_GREEN_DARK = AUTH_BRAND_GREEN_DARK;
const PAGE_BG = AUTH_PAGE_BG;
const CARD_BORDER = AUTH_CARD_BORDER;

const POLICY_ITEMS = [
  { key: 'minLength', label: 'En az 8 karakter' },
  { key: 'upper', label: 'En az bir büyük harf' },
  { key: 'lower', label: 'En az bir küçük harf' },
  { key: 'digit', label: 'En az bir rakam' },
  { key: 'symbol', label: 'En az bir sembol' },
];

function homePathForRole(role) {
  if (role === 'superadmin') return '/superadmin';
  if (role === 'admin') return '/admin';
  if (role === 'garson' || role === 'yetkili') return '/waiter';
  if (role === 'mutfak') return '/kitchen';
  if (role === 'kasa') return '/cashier';
  return '/';
}

function PasswordField({ label, value, onChange, show, onToggleShow, autoComplete }) {
  return (
    <TextField
      required
      fullWidth
      size="medium"
      name={label}
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          bgcolor: AUTH_INPUT_BG,
          '&.Mui-focused fieldset': { borderColor: BRAND_GREEN },
        },
      }}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
              onClick={onToggleShow}
              edge="end"
              size="small"
            >
              {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

function PolicyChecklist({ checks }) {
  const metCount = POLICY_ITEMS.filter((item) => checks[item.key]).length;
  const progress = (metCount / POLICY_ITEMS.length) * 100;

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: AUTH_INPUT_BG,
        border: `1px solid ${CARD_BORDER}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Şifre gücü
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {metCount}/{POLICY_ITEMS.length}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          mb: 1.5,
          height: 6,
          borderRadius: 99,
          bgcolor: '#E8EDEA',
          '& .MuiLinearProgress-bar': {
            borderRadius: 99,
            bgcolor: progress === 100 ? BRAND_GREEN : '#9CA3AF',
          },
        }}
      />
      <List dense disablePadding>
        {POLICY_ITEMS.map((item) => {
          const ok = checks[item.key];
          return (
            <ListItem key={item.key} disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {ok ? (
                  <CheckCircleOutlineIcon sx={{ fontSize: 20, color: BRAND_GREEN }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: '#C5CBC7' }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  sx: { color: ok ? 'text.primary' : 'text.secondary', fontWeight: ok ? 500 : 400 },
                }}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

export default function PasswordUpgradePage() {
  const { user, isAuthenticated, logout, refreshUserFromMe, changePassword } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checks = useMemo(() => getPasswordChecks(next), [next]);
  const passwordsMatch = next.length > 0 && next === again;
  const canSubmit =
    current.trim() && isStrongPassword(next) && passwordsMatch && !busy;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.passwordMeetsPolicy === true) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  const displayName = user.name || user.email || 'Hesabınız';

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
      await changePassword({ currentPassword: current, newPassword: next });
      await refreshUserFromMe();
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 404) {
        setError(
          msg ||
            'Şifre güncelleme servisi bulunamadı. Yerel geliştirmede backend çalışıyor olmalı; canlıda sunucuya son backend sürümünü yükleyin.'
        );
      } else {
        setError(msg || 'Şifre güncellenemedi');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: PAGE_BG,
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
          maxWidth: 440,
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3,
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: '0 12px 40px rgba(26, 31, 43, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Box
            component="img"
            src={AUTH_LOGO_PATH}
            alt="Self Kasa"
            sx={{
              width: '100%',
              maxWidth: 200,
              height: 48,
              objectFit: 'contain',
              mb: 1.5,
            }}
          />
          <Typography component="h1" variant="h5" align="center" sx={{ fontWeight: 700 }}>
            Şifrenizi güncelleyin
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, lineHeight: 1.6 }}>
            Güvenlik için hesabınızın yeni şifre kurallarına uyması gerekiyor.
          </Typography>
          <Chip
            label={displayName}
            size="small"
            sx={{
              mt: 1.5,
              bgcolor: '#EEF1F0',
              color: 'text.secondary',
              fontWeight: 500,
              border: `1px solid ${CARD_BORDER}`,
            }}
          />
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PasswordField
            label="Mevcut şifre"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
          />
          <PasswordField
            label="Yeni şifre"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            show={showNext}
            onToggleShow={() => setShowNext((v) => !v)}
            autoComplete="new-password"
          />

          {next ? <PolicyChecklist checks={checks} /> : null}

          <PasswordField
            label="Yeni şifre (tekrar)"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            show={showAgain}
            onToggleShow={() => setShowAgain((v) => !v)}
            autoComplete="new-password"
          />
          {again && !passwordsMatch ? (
            <Typography variant="caption" color="error.main">
              Şifreler eşleşmiyor
            </Typography>
          ) : null}
          {again && passwordsMatch ? (
            <Typography variant="caption" sx={{ color: BRAND_GREEN, fontWeight: 500 }}>
              Şifreler eşleşiyor
            </Typography>
          ) : null}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={!canSubmit}
            sx={{
              mt: 0.5,
              py: 1.35,
              borderRadius: 2,
              bgcolor: BRAND_GREEN,
              fontSize: '1rem',
              '&:hover': { bgcolor: BRAND_GREEN_DARK },
              '&.Mui-disabled': { bgcolor: '#C5D4C8', color: '#fff' },
            }}
          >
            {busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={() => logout()}
            sx={{ color: 'text.secondary', fontWeight: 500 }}
          >
            Çıkış yap
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
