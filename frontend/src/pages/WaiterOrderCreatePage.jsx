import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  IconButton,
  TextField,
  Divider,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import './WaiterOrderCreatePage.css';

// Kategori bazlı fallback görseller
const FALLBACK_IMAGES = {
  'Ana Yemek': '/img/steak.jpg',
  'İçecekler': '/img/drink.jpg',
  'Tatlılar': '/img/dessert.jpg',
  'Salatalar': '/img/salad.jpg',
  'Çerez': '/img/snack.jpg',
  'Ara Sıcak': '/img/appetizer.jpg',
  'Kahveler': '/img/coffee.jpg',
};

const PLACEHOLDER_IMAGE = '/img/placeholder.webp';

export default function WaiterOrderCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTable, setSelectedTable] = useState(null);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // URL'den masa ID'sini al ve masayı seç
  useEffect(() => {
    const tableIdParam = searchParams.get('tableId');
    if (tableIdParam && tables.length > 0) {
      const table = tables.find(t => String(t._id || t.id) === String(tableIdParam));
      if (table) {
        setSelectedTable(table);
      }
    }
  }, [searchParams, tables]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      const [productsRes, categoriesRes, tablesRes] = await Promise.all([
        axios.get('/api/products', { headers }),
        axios.get('/api/categories', { headers }),
        axios.get('/api/waiter/tables', { headers }),
      ]);

      const productsData = Array.isArray(productsRes.data) 
        ? productsRes.data 
        : (productsRes.data?.items || []);
      const categoriesData = Array.isArray(categoriesRes.data) 
        ? categoriesRes.data 
        : (categoriesRes.data?.items || []);
      const tablesData = Array.isArray(tablesRes.data) 
        ? tablesRes.data 
        : (tablesRes.data?.items || []);

      setProducts(productsData);
      setCategories(categoriesData);
      setTables(tablesData);
      
      // URL'den masa ID'sini kontrol et
      const tableIdParam = searchParams.get('tableId');
      if (tableIdParam && tablesData.length > 0) {
        const table = tablesData.find(t => String(t._id || t.id) === String(tableIdParam));
        if (table) {
          setSelectedTable(table);
        } else if (tablesData.length > 0) {
          // Eğer URL'deki masa bulunamazsa, ilk masayı seç
          setSelectedTable(tablesData[0]);
        }
      } else if (tablesData.length > 0) {
        // URL'de masa ID yoksa, ilk masayı varsayılan olarak seç
        setSelectedTable(tablesData[0]);
      }
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
      setError('Veriler yüklenemedi');
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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal;

  const handleSubmit = async () => {
    if (!selectedTable) {
      setError('Lütfen bir masa seçin');
      return;
    }

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
        tableId: selectedTable._id || selectedTable.id,
        items: cart.map(item => ({
          menuItemId: item._id,
          productId: item._id,
          qty: item.qty,
          note: item.note || '',
        })),
        notes: notes,
      };

      const response = await axios.post('/api/waiter/orders', orderData, { headers });
      // Sipariş başarıyla oluşturuldu, siparişler sayfasına yönlendir
      navigate(`/waiter/orders?orderId=${response.data._id || response.data.id}`);
    } catch (err) {
      console.error('Sipariş oluşturulamadı:', err);
      setError(err.response?.data?.message || 'Sipariş oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/waiter/tables');
  };

  // Görsel URL'ini al
  const getImageUrl = (product) => {
    if (product.imageUrl) {
      return product.imageUrl;
    }
    const categoryName = product.category?.name || '';
    return FALLBACK_IMAGES[categoryName] || PLACEHOLDER_IMAGE;
  };

  // Görsel yükleme hatası
  const handleImageError = (e) => {
    e.currentTarget.src = PLACEHOLDER_IMAGE;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>
          Yeni Sipariş Oluştur
        </Typography>
        
        {/* Masa Seçimi */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Masa Seçimi</InputLabel>
          <Select
            value={selectedTable?._id || selectedTable?.id || ''}
            label="Masa Seçimi"
            onChange={(e) => {
              const table = tables.find(t => String(t._id || t.id) === String(e.target.value));
              setSelectedTable(table);
            }}
          >
            {tables.map((table) => (
              <MenuItem key={table._id || table.id} value={table._id || table.id}>
                {table.name || `Masa ${table.number || ''}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* Sol Panel: Ürünler */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Kategoriler */}
          <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Tümü"
              onClick={() => setSelectedCategory('all')}
              color={selectedCategory === 'all' ? 'primary' : 'default'}
              sx={{ cursor: 'pointer' }}
            />
            {categories.map((category) => (
              <Chip
                key={category._id || category.id}
                label={category.name}
                onClick={() => setSelectedCategory(category._id || category.id)}
                color={String(selectedCategory) === String(category._id || category.id) ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>

          {/* Ürünler Grid - 3 sütun */}
          <Box className="products-container" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
            {filteredProducts.map((product) => {
              const imageUrl = getImageUrl(product);
              return (
                <Box
                  key={product._id || product.id}
                  className="product-card"
                >
                  <Box className="product-image-wrapper">
                    <Box
                      component="img"
                      src={imageUrl}
                      alt={product.name}
                      onError={handleImageError}
                      className="product-image"
                    />
                  </Box>
                  <Box className="product-card-content">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: '1rem', color: '#000' }}>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#000', fontSize: '0.9375rem' }}>
                          {product.price?.toFixed(2) || '0.00'} TL
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        sx={{
                          ml: 1,
                          textTransform: 'none',
                          minWidth: 'auto',
                          px: 2,
                          py: 0.75,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        Siparişe Ekle
                      </Button>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Sağ Panel: Sipariş Özeti */}
        <Box sx={{ width: { xs: '100%', lg: '400px' }, flexShrink: 0 }}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Sipariş Özeti - {selectedTable?.name || 'Masa Seçilmedi'}
            </Typography>

            {cart.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Sepet boş
              </Typography>
            ) : (
              <>
                <Box sx={{ mb: 2, maxHeight: '400px', overflowY: 'auto' }}>
                  {cart.map((item) => {
                    const itemImageUrl = getImageUrl(item);
                    return (
                      <Box key={item._id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #e5e7eb' }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Box
                            component="img"
                            src={itemImageUrl}
                            alt={item.name}
                            sx={{
                              width: 60,
                              height: 60,
                              objectFit: 'cover',
                              borderRadius: 1,
                            }}
                            onError={handleImageError}
                          />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.price?.toFixed(2) || '0.00'} TL
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => removeFromCart(item._id)}
                          sx={{ color: '#ef4444' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item._id, -1)}
                          sx={{ border: '1px solid #e5e7eb' }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ minWidth: 30, textAlign: 'center', fontWeight: 600 }}>
                          {item.qty}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item._id, 1)}
                          sx={{ border: '1px solid #e5e7eb' }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ ml: 'auto', fontWeight: 700 }}>
                          {(item.price * item.qty).toFixed(2)} TL
                        </Typography>
                      </Box>
                    </Box>
                    );
                  })}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Not Ekle */}
                {!showNoteField ? (
                  <Button
                    variant="text"
                    onClick={() => setShowNoteField(true)}
                    sx={{ mb: 2, textTransform: 'none' }}
                  >
                    Not Ekle
                  </Button>
                ) : (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Sipariş notu..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                )}

                {/* Toplam */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body1" color="text.secondary">
                      Ara Toplam
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {subtotal.toFixed(2)} TL
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Genel Toplam
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {total.toFixed(2)} TL
                    </Typography>
                  </Box>
                </Box>

                {/* Butonlar */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleCancel}
                    disabled={submitting}
                    sx={{ textTransform: 'none' }}
                  >
                    İptal
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={submitting || cart.length === 0}
                    sx={{ textTransform: 'none' }}
                  >
                    {submitting ? 'Gönderiliyor...' : 'Siparişi Onayla'}
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

