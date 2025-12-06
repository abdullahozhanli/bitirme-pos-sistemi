import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, IconButton, useMediaQuery, useTheme, Avatar, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptLongIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CategoryIcon from '@mui/icons-material/LocalOffer';
import QrCodeIcon from '@mui/icons-material/QrCode';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import LaunchIcon from '@mui/icons-material/Visibility';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../context/AuthContext.jsx';

const drawerWidth = 240;

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  
  // Admin menüsü - sadece admin için
  const menuItems = [
    { to: '/admin', label: 'Anasayfa', icon: <HomeIcon /> },
    { to: '/admin/siparisler', label: 'Sipariş Yönetimi', icon: <ReceiptLongIcon /> },
    { to: '/admin/masalar', label: 'Masa Yönetimi', icon: <TableRestaurantIcon /> },
    { to: '/admin/urunler', label: 'Ürün Yönetimi', icon: <Inventory2Icon /> },
    { to: '/admin/kategoriler', label: 'Kategori Yönetimi', icon: <CategoryIcon /> },
    { to: '/admin/qr-kodlar', label: 'QR Kod Yönetimi', icon: <QrCodeIcon /> },
    { to: '/', label: 'Müşteri Arayüzünü Gör', icon: <LaunchIcon /> },
  ];

  // Alt menü öğeleri
  const bottomMenuItems = [
    { label: 'Ayarlar', icon: <SettingsIcon />, onClick: () => {} },
    { label: 'Yardım', icon: <HelpIcon />, onClick: () => {} },
  ];

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      {/* Kullanıcı Profili */}
      <Box sx={{ p: 3, borderBottom: '1px solid #E5E5E5' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: '#4CAF50', 
              width: 48, 
              height: 48,
              fontSize: '1.5rem'
            }}
          >
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#000', mb: 0.5 }}>
              {user?.name || 'Admin'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#1976d2', fontSize: '0.875rem' }}>
              Yönetici
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Ana Menü */}
      <List sx={{ 
        flex: 1, 
        pt: 2, 
        px: 1,
        overflow: 'hidden',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {menuItems.map((it) => {
          // Aktif sayfa kontrolü - sadece tam eşleşme veya spesifik path kontrolü
          let active = false;
          if (it.to === '/admin') {
            // Admin Paneli sadece tam /admin path'inde aktif
            active = pathname === '/admin' || pathname === '/admin/';
          } else if (it.to === '/') {
            // Müşteri arayüzü sadece tam / path'inde aktif
            active = pathname === '/';
          } else {
            // Diğer sayfalar için pathname'in it.to ile başlaması yeterli
            active = pathname === it.to || pathname.startsWith(it.to + '/');
          }
          return (
            <ListItemButton
              key={it.to}
              component={Link}
              to={it.to}
              selected={active}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                mb: 0.5,
                borderRadius: 1,
                bgcolor: active ? 'rgba(25, 118, 210, 0.15)' : 'transparent',
                '&:hover': {
                  bgcolor: active ? 'rgba(25, 118, 210, 0.20)' : 'rgba(0, 0, 0, 0.04)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(25, 118, 210, 0.15)',
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.20)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? '#1976d2' : '#666' }}>
                {it.icon}
              </ListItemIcon>
              <ListItemText 
                primary={it.label} 
                primaryTypographyProps={{
                  fontSize: '0.9375rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1976d2' : '#333',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Alt Menü (Ayarlar, Yardım ve Çıkış) */}
      <Box sx={{ borderTop: '1px solid #E5E5E5', pt: 1, pb: 2 }}>
        <List sx={{ px: 1 }}>
          {bottomMenuItems.map((it) => (
            <ListItemButton
              key={it.label}
              onClick={() => {
                it.onClick();
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                mb: 0.5,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: '#666' }}>
                {it.icon}
              </ListItemIcon>
              <ListItemText 
                primary={it.label}
                primaryTypographyProps={{
                  fontSize: '0.9375rem',
                  color: '#333',
                }}
              />
            </ListItemButton>
          ))}
          {/* Çıkış Yap Butonu */}
          <ListItemButton
            onClick={() => {
              logout();
              if (isMobile) setMobileOpen(false);
            }}
            sx={{
              mb: 0.5,
              borderRadius: 2,
              '&:hover': {
                bgcolor: 'rgba(233, 30, 99, 0.12)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: '#e91e63' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Çıkış Yap"
              primaryTypographyProps={{
                fontSize: '0.9375rem',
                color: '#e91e63',
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile için hamburger menü - Sidebar içinde */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: (t) => t.zIndex.drawer + 1,
          }}
        >
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              bgcolor: '#FFFFFF',
              border: '1px solid #E5E5E5',
              borderRadius: 1,
              color: '#333',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      )}

      {/* Mobile Temporary Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#FFFFFF',
            borderRight: '1px solid #E5E5E5',
            overflow: 'hidden',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Persistent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#FFFFFF',
            borderRight: '1px solid #E5E5E5',
            overflow: 'hidden',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: '#FFFFFF',
          pt: { xs: 8, md: 4 }, // Mobile için üstten boşluk (hamburger menü için)
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

