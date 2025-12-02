import React from 'react';
import { AppBar, Toolbar, Container, Box, Button, Typography } from '@mui/material';
import { RestaurantMenu, SettingsOutlined, ArrowBack } from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Outlet } from 'react-router-dom';

export default function CustomerLayout() {
  const { tableNumber } = useCart();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isCartPage = location.pathname === '/sepet';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#fff' }}>
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={(theme) => ({ 
          position: 'sticky',
          top: 0,
          backgroundColor: isCartPage ? '#fff' : '#333',
          color: isCartPage ? '#333' : '#fff',
          borderBottom: isCartPage ? '1px solid #e0e0e0' : 'none',
          zIndex: 100,
          boxShadow: isCartPage ? 'none' : 'none',
        })}
      >
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, md: 64 } }}>
          <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Sol: Geri Butonu + Başlık veya Logo + Başlık */}
            {isCartPage ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
                <Button
                  onClick={() => navigate(-1)}
                  sx={{
                    minWidth: 24,
                    width: 24,
                    height: 24,
                    borderRadius: 0,
                    bgcolor: 'transparent',
                    color: '#333',
                    padding: 0,
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: 'transparent',
                    },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowBack sx={{ fontSize: 24, color: '#333' }} />
                </Button>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700, 
                    color: '#333', 
                    margin: 0,
                    lineHeight: 1,
                    fontSize: '1.25rem',
                  }}
                >
                  Sepetiniz
                </Typography>
              </Box>
            ) : (
              <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#fff' }}>
                <Box sx={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: 6, 
                  bgcolor: '#fff', 
                  color: '#333',
                  display: 'grid', 
                  placeItems: 'center', 
                  mr: 1.25 
                }}>
                  <RestaurantMenu fontSize="small" />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                  Restoran Menüsü
                </Typography>
              </Box>
            )}

            {/* Sağ: Admin Butonu - Her zaman görünür */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                component={Link}
                to={isAuthenticated && user?.role === 'admin' ? '/admin' : '/login'}
                variant="contained"
                startIcon={<SettingsOutlined />}
                sx={{ 
                  borderRadius: '8px', 
                  px: 1.75, 
                  py: 0.5, 
                  textTransform: 'none', 
                  fontWeight: 600,
                  bgcolor: '#333',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  '&:hover': { 
                    bgcolor: '#444'
                  }
                }}
              >
                Admin
              </Button>
            </Box>
          </Container>
        </Toolbar>
      </AppBar>

      {/* Ana İçerik */}
      <Box component="main" sx={{ flex: 1, bgcolor: '#fff', width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

