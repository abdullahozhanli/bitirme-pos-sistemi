import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Drawer,
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';

const API = import.meta?.env?.VITE_API_URL || 'http://localhost:5001';

export default function KitchenOrderHistory({ open, onClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const periods = ['today', 'week', 'month'];
  const periodLabels = ['Bugün', 'Bu Hafta', 'Bu Ay'];

  useEffect(() => {
    if (open) {
      fetchOrders(periods[activeTab]);
    }
  }, [open, activeTab]);

  const fetchOrders = async (period) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/kitchen/orders/history?period=${period}`,
        {
          headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {},
        }
      );
      setOrders(response.data || []);
    } catch (e) {
      console.error('Geçmiş siparişler yüklenemedi:', e);
      setError(e.response?.data?.message || e.message || 'Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 600 },
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Geçmiş Siparişler
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
            {periodLabels.map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : orders.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '200px',
                textAlign: 'center',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                {periodLabels[activeTab]} için sipariş bulunamadı
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {orders.map((order) => {
                const items = order.orderItems || order.items || [];
                const tableName = order.table?.name || order.tableId?.name || order.tableNumber || '—';
                const notes = order.notes || '';
                const orderSource = (order.waiterId || order.waiter) ? 'garson' : 'qr';
                const totalPrice = order.totalPrice || order.total || 0;

                return (
                  <Card
                    key={order._id}
                    sx={{
                      border: '1px solid #E0E0E0',
                      borderRadius: 1,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      {/* Header: Masa ve Tarih */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
                            Masa {tableName}
                          </Typography>
                          {orderSource === 'qr' ? (
                            <QrCodeIcon sx={{ fontSize: 18, color: '#666' }} />
                          ) : (
                            <PersonIcon sx={{ fontSize: 18, color: '#666' }} />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {formatDate(order.createdAt)}
                        </Typography>
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      {/* Ürünler Listesi */}
                      <Stack spacing={1} mb={notes ? 1.5 : 0}>
                        {items.map((item, idx) => (
                          <Stack key={idx} direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#000', minWidth: '30px' }}>
                              {item.qty || 1}x
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1 }}>
                              {item.name || 'Ürün'}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>

                      {/* Notlar */}
                      {notes && (
                        <>
                          <Divider sx={{ my: 1.5 }} />
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <DescriptionIcon sx={{ fontSize: 18, color: '#666', mt: 0.5, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: '#666', fontSize: '0.875rem' }}>
                              {notes}
                            </Typography>
                          </Stack>
                        </>
                      )}

                      {/* Toplam Tutar */}
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#000' }}>
                          Toplam:
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#2196F3', fontSize: '1rem' }}>
                          {formatPrice(totalPrice)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}







