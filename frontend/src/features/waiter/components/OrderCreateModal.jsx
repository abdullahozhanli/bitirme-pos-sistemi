import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

export default function OrderCreateModal({ open, onClose, table, onSaved }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && table) {
      fetchProducts();
      setCart([]);
      setNotes('');
      setError('');
    }
  }, [open, table]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/categories'),
      ]);

      const productsData = Array.isArray(productsRes.data) 
        ? productsRes.data 
        : (productsRes.data?.items || []);
      const categoriesData = Array.isArray(categoriesRes.data) 
        ? categoriesRes.data 
        : (categoriesRes.data?.items || []);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Ürünler yüklenemedi:', err);
      setError('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => {
        const catId = p.category?._id || p.category;
        return String(catId) === String(selectedCategory);
      });

  const addToCart = (product) => {
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
      setCart(cart.map(item =>
        item._id === product._id
          ? { ...item, qty: item.qty + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQuantity = (productId, change) => {
    setCart(cart.map(item =>
      item._id === productId
        ? { ...item, qty: Math.max(1, item.qty + change) }
        : item
    ).filter(item => item.qty > 0));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setError('Lütfen en az bir ürün seçin');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const orderData = {
        tableId: table._id || table.id,
        items: cart.map(item => ({
          menuItemId: item._id,
          productId: item._id,
          qty: item.qty,
          note: item.note || '',
        })),
        notes: notes,
      };

      await axios.post('/api/waiter/orders', orderData, { headers });
      onSaved();
    } catch (err) {
      console.error('Sipariş oluşturulamadı:', err);
      setError(err.response?.data?.message || 'Sipariş oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Yeni Sipariş - {table?.name}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 1 }}>
            {/* Sol: Ürün Listesi */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Ürünler
              </Typography>
              
              {/* Kategori Filtreleri */}
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Tümü"
                  onClick={() => setSelectedCategory('all')}
                  color={selectedCategory === 'all' ? 'primary' : 'default'}
                  size="small"
                />
                {categories.map(cat => (
                  <Chip
                    key={cat._id}
                    label={cat.name}
                    onClick={() => setSelectedCategory(cat._id)}
                    color={selectedCategory === cat._id ? 'primary' : 'default'}
                    size="small"
                  />
                ))}
              </Box>

              {/* Ürün Listesi */}
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {filteredProducts.map(product => (
                  <Box
                    key={product._id}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ₺{product.price.toFixed(2)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => addToCart(product)}
                      disabled={(product.countInStock ?? 0) <= 0}
                    >
                      Ekle
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Sağ: Sepet */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Sepet ({cart.length})
              </Typography>

              {cart.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography variant="body2">Sepet boş</Typography>
                </Box>
              ) : (
                <>
                  <List dense>
                    {cart.map(item => (
                      <ListItem
                        key={item._id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <ListItemText
                          primary={item.name}
                          secondary={`₺${(item.price * item.qty).toFixed(2)}`}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item._id, -1)}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center' }}>
                            {item.qty}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item._id, 1)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeFromCart(item._id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItem>
                    ))}
                  </List>

                  <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center' }}>
                      Toplam: ₺{total.toFixed(2)}
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Sipariş Notu"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    sx={{ mt: 2 }}
                    placeholder="Örn: Soğansız, az acılı..."
                  />
                </>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          İptal
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || cart.length === 0}
          startIcon={submitting ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {submitting ? 'Gönderiliyor...' : 'Siparişi Gönder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
















