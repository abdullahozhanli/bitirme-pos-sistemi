import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, IconButton, Divider, useMediaQuery, useTheme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CategoryIcon from '@mui/icons-material/Category';
import LaunchIcon from '@mui/icons-material/Launch';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../context/AuthContext.jsx';

const drawerWidth = 240;

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  
  // Admin menüsü - sadece admin için
  const menuItems = [
    { to: '/admin', label: 'Admin Paneli', icon: <DashboardIcon /> },
    { to: '/admin/siparisler', label: 'Sipariş Yönetimi', icon: <ReceiptLongIcon /> },
    { to: '/admin/urunler', label: 'Ürün Yönetimi', icon: <Inventory2Icon /> },
    { to: '/admin/kategoriler', label: 'Kategori Yönetimi', icon: <CategoryIcon /> },
    { to: '/', label: 'Müşteri Arayüzünü Gör', icon: <LaunchIcon /> },
  ];

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <>
      <Toolbar />
      <List>
        {menuItems.map((it) => {
          const active = pathname === it.to || (it.to !== '/' && pathname.startsWith(it.to));
          return (
            <ListItemButton
              key={it.to}
              component={Link}
              to={it.to}
              selected={active}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                mx: 1, borderRadius: 2,
                '&.Mui-selected': { bgcolor: 'rgba(11,11,32,0.06)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                {it.icon}
              </ListItemIcon>
              <ListItemText primary={it.label} />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: '#FFFFFF',
          color: '#000',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }}>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, color: '#333' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '20px', color: '#000' }}>
            Admin Kontrol Paneli
          </Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton 
            onClick={logout} 
            color="inherit" 
            sx={{ 
              border: '1px solid #E5E5E5', 
              borderRadius: 1, 
              minHeight: '36px', 
              minWidth: '36px',
              p: 0.5,
              color: '#333',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <LogoutIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Toolbar>
        <Divider />
      </AppBar>

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
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

