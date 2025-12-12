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
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../../shared/components/ui/ConfirmDialog.jsx';

export default function TableDetailPanel({ table, statusLabels, onEdit, onDelete, onRefresh }) {
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  const statusMap = {
    bos: 'available',
    dolu: 'full',
    rezerve: 'reserved',
    odeme_bekliyor: 'payment_pending',
  };

  const statusColor = {
    bos: 'success',
    dolu: 'error',
    rezerve: 'warning',
    odeme_bekliyor: 'info',
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      await axios.delete(`/api/admin/tables/${table._id}`, { headers });
      setDeleteConfirm(false);
      onDelete();
    } catch (err) {
      console.error('Masa silinemedi:', err);
      alert(err.response?.data?.message || 'Masa silinirken bir hata oluştu');
    } finally {
      setDeleting(false);
    }
  };

  const activeOrders = table.activeOrders || [];
  const allOrders = table.orders || [];

  return (
    <Paper sx={{ p: 3, position: 'sticky', top: 24, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Masa Detayları
        </Typography>
        <Box>
          <IconButton size="small" onClick={onRefresh} title="Yenile">
            <RefreshIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onEdit} title="Düzenle">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteConfirm(true)}
            title="Sil"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TableRestaurantIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {table.name}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Kapasite
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PeopleIcon sx={{ fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {table.capacity} Kişi
              </Typography>
            </Box>
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
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {activeOrders.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Aktif Siparişler ({activeOrders.length})
          </Typography>
          <List dense>
            {activeOrders.slice(0, 5).map((order) => {
              const orderId = order._id || order.id;
              const orderNumber = orderId ? `SIP-${orderId.toString().substring(0, 8).toUpperCase()}` : 'N/A';
              const itemsCount = (order.items || []).length;
              
              return (
                <ListItem
                  key={orderId}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => navigate(`/admin/siparisler?orderId=${orderId}`)}
                >
                  <ReceiptIcon sx={{ fontSize: 20, mr: 1, color: 'primary.main' }} />
                  <ListItemText
                    primary={orderNumber}
                    secondary={`${itemsCount} ürün • ₺${(order.total || 0).toFixed(2)}`}
                  />
                </ListItem>
              );
            })}
          </List>
          {activeOrders.length > 5 && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => navigate(`/admin/siparisler?tableId=${table._id}`)}
              sx={{ mt: 1 }}
            >
              Tümünü Gör ({activeOrders.length})
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ mb: 3, textAlign: 'center', py: 2, color: 'text.secondary' }}>
          <ReceiptIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography variant="body2">Aktif sipariş bulunmuyor</Typography>
        </Box>
      )}

      {table.totalAmount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Toplam: ₺{table.totalAmount.toFixed(2)}
          </Typography>
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {allOrders.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Sipariş Geçmişi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toplam {allOrders.length} sipariş
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={() => navigate(`/admin/siparisler?tableId=${table._id}`)}
            sx={{ mt: 1 }}
          >
            Tüm Siparişleri Gör
          </Button>
        </Box>
      )}

      <ConfirmDialog
        open={deleteConfirm}
        title="Masa Sil"
        description={`"${table.name}" adlı masayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        confirmText="Sil"
        cancelText="İptal"
      />
    </Paper>
  );
}

