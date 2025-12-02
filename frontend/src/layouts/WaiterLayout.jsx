import { Outlet, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, IconButton, Divider } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext.jsx';

export default function WaiterLayout() {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: '100%',
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 'clamp(16px, 2vw, 20px)' }}>
            {pathname === '/waiter' ? 'Garson Paneli' : pathname.includes('/waiter/tables') ? 'Masa Haritası' : pathname.includes('/waiter/orders') ? 'Sipariş Yönetimi' : 'Garson Paneli'}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={logout} color="inherit" sx={{ border: '1px solid #E5E5E5', borderRadius: 2, minHeight: '44px', minWidth: '44px' }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
        <Divider />
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          p: { xs: 'clamp(8px, 2vw, 16px)', sm: 2, md: 3 },
          mt: '64px', // AppBar height
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

