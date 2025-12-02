import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';

export default function WaiterTableDetailPanel({ table, statusLabels, onCreateOrder, onRefresh }) {
  const navigate = useNavigate();

  const statusColor = {
    bos: 'success',
    dolu: 'error',
    rezerve: 'warning',
    odeme_bekliyor: 'info',
  };

  const activeOrders = table.activeOrders || [];
  const allOrders = table.orders || [];
  const totalAmount = activeOrders.reduce((sum, o) => sum + (o.total || o.totalPrice || 0), 0);

  return (
    <Paper sx={{ p: 3, position: 'sticky', top: 24, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      {/* Başlık ve Yenile Butonu */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Masa Detayları
        </Typography>
        <IconButton size="small" onClick={onRefresh} title="Yenile">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Masa Bilgileri */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TableRestaurantIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {table.name}
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PeopleIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Kapasite
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {table.capacity} Kişi
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Durum
            </Typography>
            <Chip
              label={statusLabels[table.status] || table.status}
              size="small"
              color={statusColor[table.status] || 'default'}
            />
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Hızlı Aksiyonlar */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Hızlı İşlemler
        </Typography>
        <Stack spacing={1.5}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateOrder}
            size="large"
            sx={{ py: 1.5, fontWeight: 600 }}
          >
            Yeni Sipariş Al
          </Button>
          
          {activeOrders.length > 0 && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ReceiptIcon />}
              onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}`)}
              size="large"
              sx={{ py: 1.5, fontWeight: 600 }}
            >
              Siparişleri Gör ({activeOrders.length})
            </Button>
          )}

          {table.status === 'odeme_bekliyor' && (
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<PaymentIcon />}
              onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}&payment=true`)}
              size="large"
              sx={{ py: 1.5, fontWeight: 600 }}
            >
              Ödeme Al
            </Button>
          )}
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Aktif Siparişler */}
      {activeOrders.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Aktif Siparişler ({activeOrders.length})
          </Typography>
          <List dense>
            {activeOrders.slice(0, 5).map((order) => {
              const orderId = order._id || order.id;
              const orderNumber = orderId ? `SIP-${orderId.toString().substring(0, 8).toUpperCase()}` : 'N/A';
              const itemsCount = (order.items || order.orderItems || []).length;
              const orderTotal = order.total || order.totalPrice || 0;
              
              return (
                <ListItem
                  key={orderId}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => navigate(`/waiter/orders?orderId=${orderId}`)}
                >
                  <ReceiptIcon sx={{ fontSize: 20, mr: 1.5, color: 'primary.main' }} />
                  <ListItemText
                    primary={orderNumber}
                    secondary={`${itemsCount} ürün • ₺${orderTotal.toFixed(2)}`}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/waiter/orders?orderId=${orderId}&edit=true`);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </ListItem>
              );
            })}
          </List>
          {activeOrders.length > 5 && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}`)}
              sx={{ mt: 1 }}
            >
              Tümünü Gör ({activeOrders.length})
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ mb: 3, textAlign: 'center', py: 3, color: 'text.secondary' }}>
          <ReceiptIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography variant="body2">Aktif sipariş bulunmuyor</Typography>
        </Box>
      )}

      {/* Toplam Tutar */}
      {totalAmount > 0 && (
        <Box sx={{ 
          p: 2, 
          borderRadius: 2, 
          bgcolor: 'success.light', 
          mb: 2,
          textAlign: 'center',
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Toplam Tutar
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.dark' }}>
            ₺{totalAmount.toFixed(2)}
          </Typography>
        </Box>
      )}

      {/* Sipariş Geçmişi */}
      {allOrders.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Sipariş Geçmişi
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Toplam {allOrders.length} sipariş
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}`)}
          >
            Tüm Siparişleri Gör
          </Button>
        </Box>
      )}
    </Paper>
  );
}
















