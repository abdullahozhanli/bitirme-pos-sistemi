import React from 'react';
import { Box, Typography, Chip, Badge } from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import './WaiterTableCard.css';

export default function WaiterTableCard({ table, statusLabels, isSelected, onClick }) {
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
      className={`waiter-table-card ${statusClass} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Durum Göstergesi */}
      <Box className="status-indicator" />

      {/* İkon ve Masa Adı */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <TableRestaurantIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          {table.name}
        </Typography>
      </Box>

      {/* Kapasite */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <PeopleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          {table.capacity} Kişilik
        </Typography>
      </Box>

      {/* Durum Badge */}
      <Chip
        label={statusLabel}
        size="small"
        color={
          table.status === 'bos' ? 'success' :
          table.status === 'dolu' ? 'error' :
          table.status === 'rezerve' ? 'warning' : 'info'
        }
        sx={{ mb: 1.5, fontWeight: 600 }}
      />

      {/* Aktif Sipariş Bilgisi */}
      {table.hasActiveOrder && (
        <Box sx={{ 
          mt: 2, 
          pt: 1.5, 
          borderTop: '2px solid', 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ReceiptIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {table.activeOrderCount} Aktif Sipariş
            </Typography>
          </Box>
          {table.totalAmount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PaymentIcon sx={{ fontSize: 18, color: 'success.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                ₺{table.totalAmount.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Ödeme Bekliyor Badge */}
      {table.status === 'odeme_bekliyor' && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '2px solid', borderColor: 'warning.main' }}>
          <Chip
            icon={<PaymentIcon />}
            label="Ödeme Bekliyor"
            color="warning"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      )}
    </Box>
  );
}
















