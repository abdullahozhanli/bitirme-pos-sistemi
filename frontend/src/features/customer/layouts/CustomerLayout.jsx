import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

export default function CustomerLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#fff' }}>
      {/* Ana İçerik */}
      <Box component="main" sx={{ flex: 1, bgcolor: '#fff', width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

