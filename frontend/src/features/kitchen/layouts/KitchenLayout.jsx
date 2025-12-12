import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, IconButton, Badge, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import HistoryIcon from '@mui/icons-material/History';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import { RefreshContext } from '../context/KitchenRefreshContext.jsx';
import KitchenOrderHistory from '../components/KitchenOrderHistory.jsx';

export default function KitchenLayout() {
  const { logout } = useAuth();
  const [refreshHandler, setRefreshHandler] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Açık tema renkleri
  const lightColors = {
    bgMain: '#F5F5F5',
    bgCard: '#FAFAFA',
    bgCardHover: '#F0F0F0',
    textPrimary: '#2F2F2F',
    textSecondary: '#666666',
    border: '#E0E0E0',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: lightColors.bgMain }}>
      {/* Header - Tam Genişlik, Sidebar Yok */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.appBar,
          width: '100%',
          ml: 0,
          bgcolor: lightColors.bgCard,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderBottom: `1px solid ${lightColors.border}`,
          height: '64px',
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', px: 3, justifyContent: 'space-between' }}>
          {/* Sol Taraf - Logo ve Başlık */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Logo - Mavi Kutu, Beyaz L */}
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#2196F3',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '1.5rem',
              }}
            >
              L
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700, 
                fontSize: '1.25rem', 
                color: lightColors.textPrimary,
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Masa Sipariş Yönetimi
            </Typography>
          </Box>

          {/* Sağ Taraf - İkonlar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {refreshHandler && (
              <IconButton 
                onClick={refreshHandler} 
                sx={{ color: lightColors.textPrimary }}
                title="Yenile"
              >
                <RefreshIcon />
              </IconButton>
            )}
            {/* Geçmiş Siparişler Butonu */}
            <Button
              onClick={() => setHistoryOpen(true)}
              sx={{
                bgcolor: '#E3F2FD',
                color: '#2196F3',
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
                py: 0.75,
                borderRadius: 0.5,
                minWidth: 'auto',
                '&:hover': {
                  bgcolor: '#BBDEFB',
                },
              }}
              startIcon={<HistoryIcon />}
            >
              Geçmiş Siparişler
            </Button>
            {/* Bildirim İkonu */}
            <IconButton sx={{ color: lightColors.textPrimary }} title="Bildirimler">
              <Badge badgeContent={0} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            {/* Profil İkonu */}
            <IconButton sx={{ color: lightColors.textPrimary }} title="Profil">
              <AccountCircleIcon />
            </IconButton>
            {/* Çıkış Butonu - Açık Pembe Arka Plan, Kırmızı Parantezler ve Ok, Kırmızı Yazı */}
            <Button
              onClick={logout}
              sx={{
                bgcolor: '#FFE5E5',
                backgroundColor: '#FFE5E5',
                color: '#F44336',
                textTransform: 'none',
                fontWeight: 600,
                px: 2.5,
                py: 0.75,
                borderRadius: 0.5,
                border: 'none',
                boxShadow: 'none',
                minWidth: 'auto',
                '&:hover': {
                  bgcolor: '#FFD5D5',
                  backgroundColor: '#FFD5D5',
                  boxShadow: 'none',
                },
                '&:focus': {
                  outline: 'none',
                }
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#F44336',
                  fontSize: '1rem',
                  fontWeight: 600,
                  mr: 1.5,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    fontSize: '1rem',
                    color: '#F44336',
                    fontWeight: 600,
                  }}
                >
                  [
                </Box>
                <ArrowForwardIcon 
                  sx={{ 
                    fontSize: '1.1rem',
                    color: '#F44336',
                    mx: 0.2,
                  }} 
                />
              </Box>
              Çıkış
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Ana İçerik - Sidebar Yok, Tam Genişlik */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          pt: '64px', // Header yüksekliği kadar padding
          p: { xs: 'clamp(8px, 2vw, 16px)', sm: 2, md: 3 },
          bgcolor: lightColors.bgMain,
        }}
      >
        <RefreshContext.Provider value={setRefreshHandler}>
          <Outlet />
        </RefreshContext.Provider>
      </Box>

      {/* Geçmiş Siparişler Drawer */}
      <KitchenOrderHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </Box>
  );
}

