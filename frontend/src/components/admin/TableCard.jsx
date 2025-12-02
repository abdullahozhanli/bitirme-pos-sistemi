import React from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import './TableCard.css';

export default function TableCard({ table, statusLabels, isSelected, onClick, onEdit }) {
  const statusMap = {
    bos: 'available',
    dolu: 'full',
    rezerve: 'reserved',
    odeme_bekliyor: 'payment_pending',
  };

  const statusClass = statusMap[table.status] || 'available';
  const statusLabel = statusLabels[table.status] || table.status;

  return (
    <Box
      className={`table-card ${statusClass} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        '&:hover .edit-button': {
          opacity: 1,
        },
      }}
    >
      {/* Durum Göstergesi */}
      <Box className="status-indicator" />

      {/* Düzenle Butonu */}
      <IconButton
        className="edit-button"
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          opacity: 0,
          transition: 'opacity 0.2s',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 1)',
          },
        }}
      >
        <EditIcon fontSize="small" />
      </IconButton>

      {/* İkon */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <TableRestaurantIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
        {table.capacity > 2 && (
          <PeopleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        )}
      </Box>

      {/* Masa Adı */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        {table.name}
      </Typography>

      {/* Kapasite */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {table.capacity} Kişilik
      </Typography>

      {/* Durum Badge */}
      <Chip
        label={statusLabel}
        size="small"
        color={
          table.status === 'bos' ? 'success' :
          table.status === 'dolu' ? 'error' :
          table.status === 'rezerve' ? 'warning' : 'info'
        }
        sx={{ mb: 1 }}
      />

      {/* Aktif Sipariş Bilgisi */}
      {table.hasActiveOrder && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {table.activeOrderCount} Aktif Sipariş
          </Typography>
          {table.totalAmount > 0 && (
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
              ₺{table.totalAmount.toFixed(2)}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
















