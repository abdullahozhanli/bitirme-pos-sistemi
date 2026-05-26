import { Outlet } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import './CashierLayout.css';

export default function CashierLayout() {
  const { logout } = useAuth();

  return (
    <Box className="cashier-layout" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F5F7F6' }}>
      <AppBar
        position="sticky"
        elevation={0}
        className="cashier-layout-appbar"
        sx={{
          bgcolor: '#FFFFFF',
          color: '#1F2933',
          borderBottom: '1px solid #ECE6DC',
          boxShadow: '0 1px 0 rgba(26, 26, 26, 0.04)',
        }}
      >
        <Toolbar className="cashier-layout-toolbar" sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h6"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: 'clamp(17px, 2.5vw, 20px)',
              color: '#1F6B38',
              letterSpacing: -0.3,
            }}
          >
            Kasa
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            className="cashier-logout-btn"
            variant="outlined"
            color="inherit"
            onClick={logout}
            startIcon={<LogoutIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: '20px',
              px: 2,
              py: 1,
              minHeight: 44,
              color: '#2E7D32',
              borderColor: '#D7E7D8',
              bgcolor: '#E8F5E9',
              '&:hover': {
                bgcolor: '#DCEEDC',
                borderColor: '#4CAF50',
                color: '#1F6B38',
              },
            }}
          >
            Çıkış
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        className="cashier-layout-main"
        sx={{
          flex: 1,
          p: { xs: '12px 12px 24px', sm: 2, md: 3 },
          maxWidth: 1280,
          width: '100%',
          mx: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
