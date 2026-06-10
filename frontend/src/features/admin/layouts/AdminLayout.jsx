import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, IconButton, useMediaQuery, useTheme, Avatar, Typography } from '@mui/material';
import axios from 'axios';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptLongIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CategoryIcon from '@mui/icons-material/Category';
import CampaignIcon from '@mui/icons-material/LocalOffer';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import '../styles/admin.css';
import '../styles/admin-mobile.css';

const drawerWidth = 240;

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const [branchName, setBranchName] = useState(null);
  
  // Şube bilgisini yükle
  useEffect(() => {
    const fetchBranchName = async () => {
      // Önce user.branch'dan bak (login response'undan gelebilir)
      if (user?.branch?.name) {
        setBranchName(user.branch.name);
        return;
      }
      
      // branchId varsa API'den şube adını çek
      if (user?.branchId) {
        try {
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
          
          // SuperAdmin ise branches endpoint'ini kullan
          if (user.role === 'superadmin') {
            const response = await axios.get(`/api/superadmin/branches`, { headers });
            const branches = Array.isArray(response.data) ? response.data : [];
            const branch = branches.find(b => b._id === user.branchId);
            if (branch) {
              setBranchName(branch.name);
            }
          } else {
            // Admin için branch bilgisini al (eğer endpoint varsa)
            // Şimdilik branchId'den direkt istek atmayacağız, user.branch varsa onu kullan
            if (user.branch?.name) {
              setBranchName(user.branch.name);
            }
          }
        } catch (err) {
          console.error('Şube bilgisi yüklenemedi:', err);
        }
      }
    };
    
    fetchBranchName();
  }, [user]);
  
  // Admin menüsü - sadece admin için
  const menuItems = [
    { to: '/admin', label: 'Anasayfa', icon: <HomeIcon /> },
    { to: '/admin/siparisler', label: 'Sipariş Yönetimi', icon: <ReceiptLongIcon /> },
    { to: '/admin/masalar', label: 'Masa Yönetimi', icon: <TableRestaurantIcon /> },
    { to: '/admin/urunler', label: 'Ürün Yönetimi', icon: <Inventory2Icon /> },
    { to: '/admin/kategoriler', label: 'Kategori Yönetimi', icon: <CategoryIcon /> },
    { to: '/admin/kampanyalar', label: 'Kampanya Yönetimi', icon: <CampaignIcon /> },
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
      minHeight: 0,
      overflow: 'hidden',
    }}>
      {/* Kullanıcı Profili */}
      <Box sx={{ p: 3, borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: 'var(--color-brand-green)', 
              width: 48, 
              height: 48,
              fontSize: '1.5rem'
            }}
          >
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--color-text)', mb: 0.5 }}>
              {user?.name || 'Admin'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', mb: 0.25 }}>
              Yönetici
            </Typography>
            {branchName ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <BusinessIcon sx={{ fontSize: 14, color: '#666' }} />
                <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                  {branchName}
                </Typography>
              </Box>
            ) : user?.branchId ? (
              <Typography variant="caption" sx={{ color: '#999', fontSize: '0.75rem', fontStyle: 'italic' }}>
                Şube bilgisi yükleniyor...
              </Typography>
            ) : user?.role === 'superadmin' ? (
              <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                Tüm Şubeler
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>

      {/* Ana Menü — taşan öğeler kaydırılabilir; alt menü sabit kalır */}
      <List sx={{
        flex: '1 1 auto',
        minHeight: 0,
        pt: 2,
        pb: 1,
        px: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {menuItems.map((it) => {
          // Aktif sayfa kontrolü - sadece tam eşleşme veya spesifik path kontrolü
          let active = false;
          if (it.to === '/admin') {
            active = pathname === '/admin' || pathname === '/admin/';
          } else {
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
                borderRadius: 'var(--radius-medium)',
                bgcolor: active ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: active ? 'rgba(5, 150, 105, 0.15)' : '#f9fafb',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(5, 150, 105, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(5, 150, 105, 0.15)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? 'var(--color-brand-green)' : 'var(--color-text-muted)' }}>
                {it.icon}
              </ListItemIcon>
              <ListItemText
                primary={it.label}
                primaryTypographyProps={{
                  fontSize: '0.9375rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--color-brand-green)' : 'var(--color-text)',
                  whiteSpace: 'normal',
                  lineHeight: 1.35,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Alt Menü (Ayarlar, Yardım ve Çıkış) */}
      <Box sx={{ borderTop: '1px solid var(--color-border)', pt: 1, pb: 2, flexShrink: 0 }}>
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
              borderRadius: 'var(--radius-medium)',
              '&:hover': {
                bgcolor: '#f9fafb',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'var(--color-text-muted)' }}>
              {it.icon}
            </ListItemIcon>
            <ListItemText 
              primary={it.label}
              primaryTypographyProps={{
                fontSize: '0.9375rem',
                color: 'var(--color-text)',
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
              borderRadius: 'var(--radius-medium)',
              '&:hover': {
                bgcolor: '#fef2f2',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: '#dc2626' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Çıkış Yap"
              primaryTypographyProps={{
                fontSize: '0.9375rem',
                color: '#dc2626',
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box className="admin-panel" sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile Temporary Drawer */}
      <Drawer
        className="admin-drawer-mobile"
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
            borderRight: '1px solid var(--color-border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
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
            borderRight: '1px solid var(--color-border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        className="admin-panel-main"
        sx={{
          flex: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: '#F4F6F8',
          minWidth: 0,
        }}
      >
        {isMobile && (
          <Box component="header" className="admin-mobile-header">
            <IconButton
              className="admin-mobile-header__menu"
              onClick={handleDrawerToggle}
              aria-label="Menüyü aç"
              size="medium"
            >
              <MenuIcon />
            </IconButton>
            <Box className="admin-mobile-header__text">
              <Typography className="admin-mobile-header__title">Admin Panel</Typography>
              {branchName ? (
                <Typography className="admin-mobile-header__subtitle" component="p">
                  {branchName}
                </Typography>
              ) : null}
            </Box>
          </Box>
        )}
        <Outlet />
      </Box>
    </Box>
  );
}

