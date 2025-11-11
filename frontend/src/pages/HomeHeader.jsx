import React from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { SearchOutlined, ShoppingCartOutlined } from '@mui/icons-material';
import { Link } from 'react-router-dom';

export default function HomeHeader({ search, setSearch }) {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      mb: 2,
      gap: 2,
      flexWrap: 'wrap'
    }}>
      {/* Sol: Başlık */}
      <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-header)' }}>
        Menümüz
      </Typography>

      {/* Sağ: Arama + Sepet */}
      <Box sx={{ display: 'flex', gap: 1, flex: 1, maxWidth: '600px' }}>
        <TextField
          fullWidth
          placeholder="Menüde ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchOutlined sx={{ mr: 1, color: '#6b4f2d' }} />,
          }}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              backgroundColor: '#ffffff',
              '& fieldset': {
                borderColor: 'var(--border-soft)',
              },
              '&:hover fieldset': { borderColor: 'var(--accent)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
            },
          }}
        />
        <Button
          component={Link}
          to="/sepet"
          variant="contained"
          startIcon={<ShoppingCartOutlined />}
          className="btn-cart-black"
          sx={{ 
            px: 2, 
            py: 0.5, 
            textTransform: 'none', 
            fontWeight: 600,
            fontFamily: 'Poppins, Inter, Segoe UI, Roboto, sans-serif',
            transition: 'all 0.25s ease',
            bgcolor: '#0b0b1a',
            color: '#fff',
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: '#1a1a2e' },
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            '& .MuiButton-startIcon': { color: '#fff' }
          }}
        >
          Sepet
        </Button>
      </Box>
    </Box>
  );
}

