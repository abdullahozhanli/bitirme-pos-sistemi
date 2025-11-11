import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TextField, Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Card, CardContent, Stack, IconButton, useMediaQuery, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

export default function CartPage() {
  const { cartItems, addToCart, removeFromCart, clearCart, tableNumber } = useCart();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const calculateTotalPrice = () =>
    Number(cartItems.reduce((t, i) => t + i.qty * Number(i.unitPrice ?? i.price ?? 0), 0).toFixed(2));

  const handleCheckout = async () => {
    if (submitting) return;
    setMessage('Sipariş gönderiliyor...');
    if (!tableNumber) {
      const errorMsg = 'Sipariş verilemiyor. Lütfen önce masanızdaki QR kodu okutun.';
      setMessage(`Hata: ${errorMsg}`);
      return;
    }

    try {
      setSubmitting(true);

      const orderPayload = {
        tableNumber: String(tableNumber),
        items: cartItems.map((item) => ({
          menuItemId: item._id || item.id, // Product ID'si de olabilir, backend handle edecek
          productId: item._id || item.id, // Geriye dönük uyumluluk için
          qty: item.qty,
          note: item.note || ''
        })),
        notes: notes || '',
      };

      const res = await axios.post('/api/orders', orderPayload);
      const created = res.data;

      setOrderId(String(created?._id || '').slice(-6));
      setOrderSuccess(true);
      clearCart();
    } catch (error) {
      console.error('Sipariş hatası:', error);
      const errorMsg = error?.response?.data?.message || 'Sipariş gönderilemedi.';
      setMessage(`Hata: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setOrderSuccess(false);
    navigate('/');
  };

  return (
    <Box sx={{ px: { xs: 'clamp(8px, 2vw, 16px)', sm: 2, md: 3 }, py: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h2" fontWeight={700} sx={{ mb: { xs: 2, sm: 3 }, fontSize: 'clamp(18px, 2.5vw, 24px)', color: '#333', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: '#fff',
            color: '#333',
            fontSize: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          🛒
        </Box>
        Sepetiniz {tableNumber && <Typography component="span" sx={{ color: 'text.secondary', fontSize: 'clamp(14px, 1.8vw, 18px)' }}>(Masa: {tableNumber})</Typography>}
      </Typography>
      {message && (
        <Typography sx={{ mb: 2, color: message.includes('Hata') ? 'error.main' : 'success.main', fontSize: 'clamp(12px, 1.8vw, 16px)' }}>
          {message}
        </Typography>
      )}

      {cartItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: { xs: 4, sm: 6 } }}>
          <Typography variant="body1" sx={{ mb: 3, fontSize: 'clamp(14px, 1.8vw, 18px)', color: 'text.secondary' }}>
            Sepetiniz şu anda boş.
          </Typography>
          <Button
            component={Link}
            to="/"
            variant="contained"
            sx={{
              bgcolor: '#0B0B20',
              color: '#fff',
              px: 3,
              py: 1.5,
              minHeight: '44px',
              borderRadius: 2,
              textTransform: 'none',
            fontWeight: 600,
              fontSize: 'clamp(14px, 1.8vw, 16px)',
              '&:hover': { bgcolor: '#1a1a2e' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
          >
            Menüye Dön
          </Button>
        </Box>
      ) : (
        <Box>
          {/* Mobil: Stacked Cards */}
          {isMobile ? (
            <Stack spacing={2} sx={{ mb: 3 }}>
              {cartItems.map((item) => (
                <Card key={item._id} sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, fontSize: 'clamp(16px, 2vw, 18px)' }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 'clamp(12px, 1.8vw, 14px)' }}>
                      {item.category?.name || 'Kategorisiz'} {item.sizeLabel ? `• ${item.sizeLabel}` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                        <IconButton
                          onClick={() => removeFromCart(item, item.sizeKey)}
                          disabled={submitting}
                          sx={{ minHeight: '44px', minWidth: '44px' }}
                        >
                          <RemoveIcon />
                        </IconButton>
                        <Typography sx={{ minWidth: 40, textAlign: 'center', fontWeight: 600, fontSize: 'clamp(14px, 1.8vw, 16px)' }}>
                          {item.qty}
                        </Typography>
                        <IconButton
                          onClick={() => addToCart(item, item.sizeKey)}
                          disabled={submitting}
                          sx={{ minHeight: '44px', minWidth: '44px' }}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" fontWeight={700} sx={{ color: '#d17a3a', fontSize: 'clamp(16px, 2vw, 18px)' }}>
                          {(item.qty * Number(item.unitPrice ?? item.price)).toFixed(2)} TL
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 'clamp(11px, 1.5vw, 13px)' }}>
                          {Number(item.unitPrice ?? item.price).toFixed(2)} TL/adet
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            /* Desktop: Table View */
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
            {cartItems.map((item, index) => (
                <Box
                  key={item._id}
                  sx={{
                    display: 'flex', 
                    alignItems: 'center',
                    p: 2,
                    borderBottom: index < cartItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                    bgcolor: index % 2 === 0 ? '#fff' : '#fafafa',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.category?.name || 'Kategorisiz'} {item.sizeLabel ? `• ${item.sizeLabel}` : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <IconButton
                      onClick={() => removeFromCart(item, item.sizeKey)} 
                      disabled={submitting}
                        sx={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        <RemoveIcon />
                      </IconButton>
                      <Typography sx={{ minWidth: 40, textAlign: 'center', fontWeight: 600 }}>
                      {item.qty}
                      </Typography>
                      <IconButton
                      onClick={() => addToCart(item, item.sizeKey)} 
                      disabled={submitting}
                        sx={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>
                    <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#d17a3a' }}>
                      {(item.qty * Number(item.unitPrice ?? item.price)).toFixed(2)} TL
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                      {Number(item.unitPrice ?? item.price).toFixed(2)} TL/adet
                      </Typography>
                    </Box>
                  </Box>
                </Box>
            ))}
            </Box>
          )}

          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <TextField
              label="Sipariş Notu (Opsiyonel)"
              placeholder="Örn: Soğansız olsun, az acılı..."
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  minHeight: '44px',
                },
              }}
            />
          </Box>

          <Box sx={{ 
            p: { xs: 2, sm: 2.5 },
            bgcolor: '#f5f5f5',
            borderRadius: 2,
            mb: { xs: 2, sm: 3 },
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: 'clamp(16px, 2vw, 20px)' }}>
                Toplam Tutar:
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color: '#333' }}>
                {calculateTotalPrice().toFixed(2)} TL
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
            <Button
              onClick={handleCheckout}
              disabled={submitting || cartItems.length === 0 || !tableNumber}
              variant="contained"
              sx={{
                px: { xs: 4, sm: 5 },
                py: { xs: 1.5, sm: 1.75 },
                minHeight: '44px',
                fontSize: 'clamp(14px, 1.8vw, 18px)',
                bgcolor: submitting ? '#999' : (!tableNumber ? '#ccc' : '#0B0B20'),
                color: '#fff',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                width: { xs: '100%', sm: 'auto' },
                boxShadow: submitting || !tableNumber ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
                '&:hover': {
                  bgcolor: submitting ? '#999' : (!tableNumber ? '#ccc' : '#1a1a2e'),
                },
                '&:disabled': {
                  bgcolor: '#ccc',
                  color: '#fff',
                },
              }}
            >
              {submitting ? '🔄 Gönderiliyor...' : !tableNumber ? '📱 QR Kodu Okutun' : 'Siparişi Tamamla'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Sipariş Onay Modal */}
      <Dialog
        open={orderSuccess}
        onClose={handleCloseSuccessModal}
        PaperProps={{
          sx: {
            bgcolor: '#282828',
            color: '#fff',
            borderRadius: 3,
            width: { xs: '90%', sm: 400 },
            maxWidth: 500,
            mx: 'auto',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, color: '#fff', fontSize: { xs: '0.8rem', sm: '0.875rem' }, fontWeight: 500 }}>
          localhost:5173 web sitesinin mesajı
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 3, px: { xs: 2, sm: 3 } }}>
          <Typography sx={{ color: '#fff', fontSize: { xs: '0.9rem', sm: '1rem' }, lineHeight: 1.6 }}>
            Siparişiniz alındı. Masa {tableNumber} • ID: ...{orderId}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, justifyContent: 'flex-end' }}>
          <Button
            onClick={handleCloseSuccessModal}
            sx={{
              bgcolor: '#C3A0E8',
              color: '#5C3E8C',
              px: { xs: 2.5, sm: 3 },
              py: { xs: 0.75, sm: 1 },
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              border: '2px solid #C3A0E8',
              width: { xs: '100%', sm: 'auto' },
              '&:hover': {
                bgcolor: '#B890D0',
                borderColor: '#B890D0',
              },
            }}
          >
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}