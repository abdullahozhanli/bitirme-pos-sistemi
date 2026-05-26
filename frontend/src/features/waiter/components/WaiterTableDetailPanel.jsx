import React from 'react';
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
import CloseIcon from '@mui/icons-material/Close';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import { TABLE_STATUS, STATUS_LABELS, STATUS_COLORS } from '../constants/tableStatus.js';
import { getOrderPaymentDisplayText } from '../../../shared/utils/orderPayment';
import './WaiterTableDetailPanel.css';

export default function WaiterTableDetailPanel({ table, statusLabels, onCreateOrder, onRefresh, onClose }) {
  const navigate = useNavigate();

  // Status class for CSS badge styling
  const statusClassMap = {
    [TABLE_STATUS.AVAILABLE]: 'available',
    [TABLE_STATUS.OCCUPIED]: 'full',
    [TABLE_STATUS.RESERVED]: 'reserved',
    [TABLE_STATUS.PAYMENT_PENDING]: 'payment_pending',
  };
  const statusClass = statusClassMap[table.status] || 'available';

  const activeOrders = table.activeOrders || [];
  const allOrders = table.orders || [];
  const totalAmount = activeOrders.reduce((sum, o) => sum + (o.total || o.totalPrice || 0), 0);

  return (
    <Paper className="waiter-table-detail-panel" sx={{ 
      p: { xs: 2, lg: 3 }, 
      position: { xs: 'relative', lg: 'sticky' }, 
      top: { lg: 24 }, 
      maxHeight: { lg: 'calc(100vh - 100px)' }, 
      overflowY: 'auto',
      boxShadow: { xs: 'none', lg: '0 1px 3px rgba(0, 0, 0, 0.05)' },
    }}>
      {/* Kompakt Header - Mobilde */}
      <Box className="detail-panel-header-mobile" sx={{ display: { xs: 'flex', lg: 'none' }, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '15px' }}>
          Masa {table.name} → {table.capacity} Kişilik
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={onRefresh} title="Yenile" sx={{ padding: '6px' }}>
            <RefreshIcon sx={{ fontSize: '18px' }} />
          </IconButton>
          {onClose && (
            <IconButton size="small" onClick={onClose} title="Kapat" sx={{ padding: '6px' }}>
              <CloseIcon sx={{ fontSize: '18px' }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Desktop Header */}
      <Box className="detail-panel-header-desktop" sx={{ display: { xs: 'none', lg: 'flex' }, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Masa Detayları
        </Typography>
        <IconButton size="small" onClick={onRefresh} title="Yenile">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider className="detail-panel-divider" sx={{ mb: 2, display: { xs: 'none', lg: 'block' } }} />

      {/* Masa Bilgileri */}
      <Box className="detail-panel-info" sx={{ mb: { xs: 2, lg: 3 } }}>
        <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1, mb: 2 }}>
          <TableRestaurantIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {table.name}
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, justifyContent: 'space-between', alignItems: 'center' }}>
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

          {/* Status - Inline with badge */}
          <Box className="detail-panel-status" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '13px', lg: '14px' } }}>
              Durum:
            </Typography>
            <span className={`detail-status-badge detail-status-badge-${statusClass}`}>
              {statusLabels[table.status] || table.status}
            </span>
          </Box>
        </Stack>
      </Box>

      <Divider className="detail-panel-divider" sx={{ my: { xs: 1.5, lg: 2 }, display: { xs: 'none', lg: 'block' } }} />

      {/* Hızlı Aksiyonlar */}
      <Box className="detail-panel-actions" sx={{ mb: { xs: 2, lg: 3 } }}>
        <Typography variant="subtitle2" className="detail-section-title" sx={{ fontWeight: 600, mb: { xs: 1, lg: 1.5 }, fontSize: { xs: '13px', lg: '14px' }, display: { xs: 'none', lg: 'block' } }}>
          Hızlı İşlemler
        </Typography>
        <Stack spacing={{ xs: 1, lg: 1.5 }}>
          {/* Sadece müsait masalarda sipariş al butonu göster */}
          {table.status === TABLE_STATUS.AVAILABLE && (
            <Box 
              className="detail-action-primary-available"
              onClick={() => {
                if (onCreateOrder) {
                  onCreateOrder();
                } else {
                  navigate(`/waiter/orders/create?tableId=${table._id || table.id}`);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                padding: { xs: '12px 16px', lg: '14px 20px' },
                borderRadius: { xs: '12px', lg: '12px' },
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: { xs: '#10B981', lg: '#10B981' },
                color: 'white',
                fontWeight: 600,
                fontSize: { xs: '14px', lg: '16px' },
              }}
            >
              <AddIcon sx={{ fontSize: { xs: '18px', lg: '20px' } }} />
              <span>Yeni Sipariş Al</span>
            </Box>
          )}
          
          {activeOrders.length > 0 && (
            <Box 
              className="detail-action-row"
              onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}`)}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                padding: { xs: '10px 12px', lg: '14px 16px' },
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <ReceiptIcon sx={{ fontSize: { xs: '18px', lg: '20px' }, color: '#6B7280' }} />
              <Typography sx={{ flex: 1, fontSize: { xs: '13px', lg: '14px' }, fontWeight: 500, color: '#111827' }}>
                Siparişleri Gör ({activeOrders.length})
              </Typography>
            </Box>
          )}

          {table.status === TABLE_STATUS.PAYMENT_PENDING && (
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<PaymentIcon />}
              onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}&payment=true`)}
              size="large"
              sx={{ py: { xs: 1.25, lg: 1.5 }, fontWeight: 600, fontSize: { xs: '14px', lg: '16px' } }}
            >
              Ödeme Al
            </Button>
          )}
        </Stack>
      </Box>

      <Box className="detail-panel-spacer" sx={{ height: { xs: 12, lg: 0 }, display: { xs: 'block', lg: 'none' } }} />

      {/* Aktif Siparişler */}
      {activeOrders.length > 0 ? (
        <Box className="detail-panel-orders" sx={{ mb: { xs: 2, lg: 3 } }}>
          <Typography variant="subtitle2" className="detail-section-title" sx={{ fontWeight: 600, mb: { xs: 1, lg: 1.5 }, fontSize: { xs: '13px', lg: '14px' } }}>
            Aktif Siparişler ({activeOrders.length})
          </Typography>
          <List dense className="detail-orders-list" sx={{ padding: 0 }}>
            {activeOrders.slice(0, 5).map((order) => {
              const orderId = order._id || order.id;
              const orderNumber = orderId ? `SIP-${orderId.toString().substring(0, 8).toUpperCase()}` : 'N/A';
              const items = order.orderItems || order.items || [];
              const totalItemsCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
              const orderTotal = order.total || order.totalPrice || 0;
              
              return (
                <ListItem
                  key={orderId}
                  className="detail-order-item"
                  sx={{
                    border: '1px solid',
                    borderColor: '#E5E7EB',
                    borderRadius: '12px',
                    mb: { xs: 0.75, lg: 1 },
                    padding: { xs: '10px 12px', lg: '12px 16px' },
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate(`/waiter/orders?orderId=${orderId}`)}
                >
                  <ReceiptIcon sx={{ fontSize: { xs: '18px', lg: '20px' }, mr: { xs: 1, lg: 1.5 }, color: '#6B7280' }} />
                  <ListItemText
                    primary={orderNumber}
                    secondary={`${totalItemsCount} ürün • ₺${orderTotal.toFixed(2)} • ${getOrderPaymentDisplayText(order)}`}
                    primaryTypographyProps={{ 
                      fontWeight: 600, 
                      fontSize: { xs: '13px', lg: '14px' },
                      color: '#111827'
                    }}
                    secondaryTypographyProps={{
                      fontSize: { xs: '11px', lg: '12px' },
                      color: '#6B7280'
                    }}
                    sx={{ margin: 0 }}
                  />
                  <IconButton
                    size="small"
                    className="detail-order-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/waiter/orders?orderId=${orderId}&edit=true`);
                    }}
                    sx={{ 
                      padding: { xs: '4px', lg: '6px' },
                      '&:hover': {
                        backgroundColor: '#F3F4F6'
                      }
                    }}
                  >
                    <EditIcon sx={{ fontSize: { xs: '16px', lg: '18px' }, color: '#6B7280' }} />
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
        <Box className="detail-empty-state" sx={{ mb: { xs: 2, lg: 3 }, textAlign: 'center', py: { xs: 1.5, lg: 3 }, color: 'text.secondary' }}>
          <ReceiptIcon sx={{ fontSize: { xs: 24, lg: 48 }, mb: { xs: 0.5, lg: 1 }, opacity: 0.2 }} />
          <Typography variant="body2" sx={{ fontSize: { xs: '11px', lg: '14px' }, color: '#9CA3AF' }}>Aktif sipariş bulunmuyor</Typography>
        </Box>
      )}

      {/* Toplam Tutar */}
      {totalAmount > 0 && (
        <Box className="detail-total-amount" sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: { xs: '12px 0', lg: '16px 0' },
          borderTop: { xs: '1px solid #E5E7EB', lg: 'none' },
          borderBottom: { xs: '1px solid #E5E7EB', lg: 'none' },
          mb: { xs: 2, lg: 2 },
          mt: { xs: 2, lg: 0 },
        }}>
          <Typography variant="body2" sx={{ fontSize: { xs: '13px', lg: '14px' }, fontWeight: 500, color: '#6B7280' }}>
            Toplam Tutar
          </Typography>
          <Typography variant="body1" sx={{ fontSize: { xs: '16px', lg: '20px' }, fontWeight: 700, color: '#111827' }}>
            ₺{totalAmount.toFixed(2)}
          </Typography>
        </Box>
      )}

      {/* Sipariş Geçmişi */}
      {allOrders.length > 0 && (
        <Box className="detail-order-history">
          <Box 
            className="detail-history-link"
            onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}`)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: { xs: '8px 0', lg: '12px 0' },
              cursor: 'pointer',
              borderTop: { xs: '1px solid #E5E7EB', lg: 'none' },
              mt: { xs: 2, lg: 0 },
            }}
          >
            <Typography variant="body2" sx={{ fontSize: { xs: '12px', lg: '13px' }, color: '#6B7280' }}>
              Sipariş Geçmişi ({allOrders.length})
            </Typography>
            <Typography variant="body2" sx={{ fontSize: { xs: '12px', lg: '13px' }, color: '#1976d2', fontWeight: 500 }}>
              Görüntüle →
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
















