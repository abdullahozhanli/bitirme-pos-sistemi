import React from 'react';
import { AppBar, Toolbar, Container, Box, Button, Typography } from '@mui/material';
import { RestaurantMenu, SettingsOutlined } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Outlet } from 'react-router-dom';

export default function CustomerLayout() {
  const { tableNumber } = useCart();
  const { isAuthenticated } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#FAF7F1' }}>
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={(theme) => ({ 
          position: 'sticky',
          top: 0,
          backgroundColor: '#fffaf4',
          color: '#6b4f2d',
          borderBottom: '1px solid #e8e2d9',
          zIndex: 100,
          boxShadow: 'none',
          backdropFilter: 'blur(6px)',
        })}
      >
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, md: 64 } }}>
          <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Sol: Logo + Başlık */}
            <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', borderBottom: '2px solid transparent', '&:hover': { borderBottomColor: '#d2a679' }, borderRadius: 1 }}>
              <Box sx={{ 
                width: 28, 
                height: 28, 
                borderRadius: 6, 
                bgcolor: 'var(--accent)', 
                color: '#fff',
                display: 'grid', 
                placeItems: 'center', 
                mr: 1.25 
              }}>
                <RestaurantMenu fontSize="small" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-main)' }}>
                Restoran Menüsü
              </Typography>
            </Box>

            {/* Sağ: Butonlar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Masa Numarası */}
              <Box sx={{ 
                px: 1.75, 
                py: 0.5, 
                borderRadius: '999px', 
                bgcolor: 'var(--border-light)', 
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: 'var(--font-main)'
              }}>
                Masa: {tableNumber ?? '—'}
              </Box>

              {/* Admin Linki */}
              <Button
                component={Link}
                to={isAuthenticated ? '/admin' : '/login'}
                variant="outlined"
                startIcon={<SettingsOutlined />}
                sx={{ 
                  borderRadius: '8px', 
                  px: 1.75, 
                  py: 0.5, 
                  textTransform: 'none', 
                  fontWeight: 600,
                  borderColor: 'var(--border-soft)',
                  color: '#6b4f2d',
                  '&:hover': { 
                    bgcolor: '#f5ecdf'
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
      <Box component="main" sx={{ flex: 1, bgcolor: '#FAF7F1', width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

