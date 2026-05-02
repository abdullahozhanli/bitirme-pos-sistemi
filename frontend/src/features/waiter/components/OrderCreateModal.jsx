import React, { useState, useEffect, useRef } from 'react';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { useAuth } from '../../../shared/context/AuthContext.jsx';
import './OrderCreateModal.css';

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

export default function OrderCreateModal({ open, onClose, table, onSaved }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const categoryScrollRef = useRef(null);

  useEffect(() => {
    if (open) {
      setCart([]);
      setNotes('');
      setError('');
      setSearchTerm('');
      if (table) {
        setLoading(true);
        fetchProducts();
      } else {
        setError('Masa seçilmedi. Lütfen önce bir masa seçin.');
        setLoading(false);
      }
    } else {
      setCart([]);
      setNotes('');
      setError('');
      setSearchTerm('');
      setProducts([]);
      setCategories([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, table]);

  // Mouse wheel and drag horizontal scroll for category bar
  useEffect(() => {
    const scrollElement = categoryScrollRef.current;
    if (!scrollElement) return;

    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    // Mouse wheel horizontal scroll (desktop)
    const handleWheel = (e) => {
      const rect = scrollElement.getBoundingClientRect();
      const isOverContainer = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );

      if (!isOverContainer) {
        return; // Let normal page scroll happen
      }

      const canScrollHorizontally = scrollElement.scrollWidth > scrollElement.clientWidth;
      if (!canScrollHorizontally) {
        return;
      }

      if (e.deltaX !== 0) {
        return; // Already horizontal scroll
      }

      if (e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        scrollElement.scrollLeft += e.deltaY;
      }
    };

    // Mouse drag scrolling (desktop)
    const handleMouseDown = (e) => {
      isDragging = true;
      startX = e.pageX - scrollElement.offsetLeft;
      scrollLeft = scrollElement.scrollLeft;
      scrollElement.style.cursor = 'grabbing';
      scrollElement.style.userSelect = 'none';
    };

    const handleMouseLeave = () => {
      isDragging = false;
      scrollElement.style.cursor = 'grab';
      scrollElement.style.userSelect = '';
    };

    const handleMouseUp = () => {
      isDragging = false;
      scrollElement.style.cursor = 'grab';
      scrollElement.style.userSelect = '';
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - scrollElement.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed multiplier
      scrollElement.scrollLeft = scrollLeft - walk;
    };

    scrollElement.addEventListener('wheel', handleWheel, { passive: false });
    scrollElement.addEventListener('mousedown', handleMouseDown);
    scrollElement.addEventListener('mouseleave', handleMouseLeave);
    scrollElement.addEventListener('mouseup', handleMouseUp);
    scrollElement.addEventListener('mousemove', handleMouseMove);

    // Set initial cursor style
    scrollElement.style.cursor = 'grab';

    return () => {
      scrollElement.removeEventListener('wheel', handleWheel);
      scrollElement.removeEventListener('mousedown', handleMouseDown);
      scrollElement.removeEventListener('mouseleave', handleMouseLeave);
      scrollElement.removeEventListener('mouseup', handleMouseUp);
      scrollElement.removeEventListener('mousemove', handleMouseMove);
      scrollElement.style.cursor = '';
      scrollElement.style.userSelect = '';
    };
  }, [products.length, categories.length]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
      
      // Kullanıcının branchId'sini al
      const branchId = user?.branchId || user?.branch?._id || null;
      
      // branchId varsa query parametresi olarak ekle
      const productParams = branchId ? { branchId } : {};
      const categoryParams = branchId ? { branchId } : {};
      
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get('/api/products', { headers, params: productParams }),
        axios.get('/api/categories', { headers, params: categoryParams }),
      ]);

      const productsData = Array.isArray(productsRes.data) 
        ? productsRes.data 
        : (productsRes.data?.items || []);
      const categoriesData = Array.isArray(categoriesRes.data) 
        ? categoriesRes.data 
        : (categoriesRes.data?.items || []);

      setProducts(productsData);
      setCategories(categoriesData);
      
      // Debug: Ürünlerin imageUrl'lerini kontrol et
      console.log('📦 Yüklenen ürünler:', productsData.length);
      if (productsData.length > 0) {
        const withImage = productsData.filter(p => p.imageUrl).length;
        const withoutImage = productsData.length - withImage;
        console.log(`📸 Resimli ürünler: ${withImage}, Resimsiz: ${withoutImage}`);
        if (withoutImage > 0) {
          console.log('⚠️ Resimsiz ürünler:', productsData.filter(p => !p.imageUrl).map(p => ({ name: p.name, category: p.category?.name })));
        }
      }
      
      if (productsData.length === 0) {
        setError('Henüz ürün bulunmuyor.');
      }
    } catch (err) {
      console.error('Ürünler yüklenemedi:', err);
      setError(err.response?.data?.message || 'Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    // Kategori filtresi
    if (selectedCategory !== 'all') {
      const catId = p.category?._id || p.category;
      if (String(catId) !== String(selectedCategory)) {
        return false;
      }
    }
    
    // Arama filtresi
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesName = p.name?.toLowerCase().includes(q);
      const matchesDescription = p.description?.toLowerCase().includes(q);
      const matchesCategory = p.category?.name?.toLowerCase().includes(q);
      
      if (!matchesName && !matchesDescription && !matchesCategory) {
        return false;
      }
    }
    
    return true;
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

  const getImageUrl = (product) => {
    // Önce product.imageUrl kontrol et
    if (product.imageUrl) {
      return product.imageUrl;
    }
    // Sonra kategori bazlı fallback (müşteri arayüzünde de var ama kullanılmıyor, biz ekleyelim)
    const categoryName = product.category?.name || '';
    if (categoryName && FALLBACK_IMAGES[categoryName]) {
      return FALLBACK_IMAGES[categoryName];
    }
    // En son placeholder
    return PLACEHOLDER_IMAGE;
  };

  // Görsel yükleme hatası (müşteri arayüzü gibi)
  const handleImageError = (e) => {
    console.error('❌ Resim yüklenemedi:', e.currentTarget.src);
    // Placeholder'a geç
    if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
      e.currentTarget.src = PLACEHOLDER_IMAGE;
    } else {
      // Placeholder da yüklenemezse, resmi gizle ve arka plan rengini göster
      e.currentTarget.style.display = 'none';
    }
  };

  // Badge belirleme (kategori bazlı)
  const getProductBadge = (product) => {
    if (!product.category) return null;
    const categoryName = product.category.name || '';
    
    const badgeMap = {
      'Ana Yemek': 'Özel',
      'Tatlılar': 'Lezzetli',
      'İçecekler': 'Taze',
      'Salatalar': 'Sağlıklı',
      'Kahveler': 'Özel',
      'Ara Sıcak': 'Sıcak',
      'Çerez': 'Çıtır'
    };
    
    return badgeMap[categoryName] || null;
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

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

  if (!open) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          maxHeight: { xs: '100vh', md: '90vh' },
          height: { xs: '100vh', md: 'auto' },
          display: 'flex',
          flexDirection: 'column',
          margin: { xs: 0, md: 'auto' },
          borderRadius: { xs: 0, md: 2 },
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        flexShrink: 0,
        padding: { xs: '12px 16px', md: '24px' },
        paddingBottom: { xs: '12px', md: '16px' },
        borderBottom: '1px solid #E5E7EB',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '16px', md: '20px' } }}>
            Yeni Sipariş {table ? `- ${table.name}` : ''}
          </Typography>
          {isMobile && (
            <IconButton onClick={onClose} sx={{ padding: '8px' }}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        
        {/* Arama Çubuğu */}
        <Box sx={{ mb: 2 }}>
          <div className="search-input-wrapper">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Box>
        
        {/* Kategoriler - Yatay Scroll Bar */}
        {!loading && products.length > 0 && (
          <Box 
            ref={categoryScrollRef}
            sx={{ 
            display: 'flex',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
            marginLeft: { xs: '-12px', md: '-24px' },
            marginRight: { xs: '-12px', md: '-24px' },
            paddingLeft: { xs: '12px', md: '24px' },
            paddingRight: { xs: '12px', md: '24px' },
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}>
            <Box sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              gap: '12px',
              alignItems: 'center',
              minWidth: 'max-content',
            }}>
              <Button
                onClick={() => setSelectedCategory('all')}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 14px',
                  height: '40px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: selectedCategory === 'all' ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: selectedCategory === 'all' ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: selectedCategory === 'all' ? '#E8F5E9' : '#F9FAFB',
                  color: selectedCategory === 'all' ? '#10B981' : '#6B7280',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                  textTransform: 'none',
                  boxShadow: 'none',
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: selectedCategory === 'all' ? '#D4EDDA' : '#F3F4F6',
                    boxShadow: 'none',
                    transform: 'none',
                  },
                }}
              >
                Tümü
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat._id)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 14px',
                    height: '40px',
                    borderRadius: '999px',
                    fontSize: '14px',
                    fontWeight: selectedCategory === cat._id ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: selectedCategory === cat._id ? 'none' : '1px solid #E5E7EB',
                    backgroundColor: selectedCategory === cat._id ? '#E8F5E9' : '#F9FAFB',
                    color: selectedCategory === cat._id ? '#10B981' : '#6B7280',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                    textTransform: 'none',
                    boxShadow: 'none',
                    minWidth: 'auto',
                    '&:hover': {
                      backgroundColor: selectedCategory === cat._id ? '#D4EDDA' : '#F3F4F6',
                      boxShadow: 'none',
                      transform: 'none',
                    },
                  }}
                >
                  {cat.name}
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ 
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: { xs: '12px', md: '24px' },
        paddingBottom: { xs: '120px', md: '100px' },
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        WebkitOverflowScrolling: 'touch',
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {!table ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Masa Seçilmedi
            </Typography>
            <Button variant="outlined" onClick={onClose}>
              Kapat
            </Button>
          </Box>
        ) : loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Ürünler yükleniyor...
            </Typography>
          </Box>
        ) : products.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Ürün Bulunamadı
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Henüz ürün bulunmuyor.
            </Typography>
          </Box>
        ) : (
          <Box 
            className="order-product-list"
            sx={{ 
              flex: 1,
              display: 'grid',
              gridTemplateColumns: { 
                xs: 'repeat(2, 1fr)', 
                sm: 'repeat(2, 1fr)', 
                md: 'repeat(3, 1fr)', 
                lg: 'repeat(4, 1fr)',
                xl: 'repeat(5, 1fr)'
              },
              gap: { xs: '6px', sm: '12px', md: '16px', lg: '20px' },
              alignContent: 'start',
              width: '100%',
              boxSizing: 'border-box',
            }}>
            {filteredProducts.length === 0 ? (
              <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Bu kategoride ürün bulunmuyor.
                </Typography>
              </Box>
            ) : (
              filteredProducts.map(product => {
                const cartItem = cart.find(item => item._id === product._id);
                const qty = cartItem?.qty || 0;
                const imageUrl = getImageUrl(product);
                const isOutOfStock = (product.countInStock ?? 0) <= 0;
                const productBadge = getProductBadge(product);
                
                return (
                  <div
                    key={product._id}
                    className="waiter-product-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      overflow: 'visible',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      height: 'auto',
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Image with Badge - Müşteri arayüzü gibi */}
                    <div className="product-image-wrapper">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="product-image"
                        loading="lazy"
                        onError={handleImageError}
                        onLoad={() => {
                          console.log('✅ Resim yüklendi:', imageUrl, product.name);
                        }}
                      />
                      {productBadge && (
                        <div className="product-popular-badge">{productBadge}</div>
                      )}
                      {isOutOfStock && (
                        <div className="product-out-of-stock">
                          TÜKENDİ
                        </div>
                      )}
                    </div>

                    {/* Card Content - Müşteri arayüzü gibi */}
                    <div className="product-card-content" style={{ 
                      padding: '12px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      flexGrow: 1,
                      minHeight: '100px',
                      height: 'auto',
                      visibility: 'visible',
                      opacity: 1,
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <h3 className="product-name" style={{ 
                        fontSize: '18px', 
                        fontWeight: 700, 
                        color: '#111827', 
                        margin: '0 0 12px 0',
                        lineHeight: '1.4'
                      }}>
                        {product.name}
                      </h3>

                      {/* Footer: Price + Add Button - Müşteri arayüzü gibi */}
                      <div 
                        className="product-front-footer" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          gap: '12px', 
                          marginTop: 'auto', 
                          paddingTop: '12px',
                          width: '100%',
                          visibility: 'visible',
                          opacity: 1
                        }}
                      >
                        <p 
                          className="product-price-green" 
                          style={{ 
                            fontSize: '18px', 
                            fontWeight: 600, 
                            color: '#059669', 
                            margin: 0,
                            display: 'block',
                            visibility: 'visible',
                            opacity: 1
                          }}
                        >
                          ₺{product.price.toFixed(0)}
                        </p>
                        {qty > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(product._id, -1);
                              }}
                              disabled={isOutOfStock}
                              sx={{
                                width: '32px',
                                height: '32px',
                                minWidth: '32px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                backgroundColor: '#FFFFFF',
                                '&:hover': {
                                  backgroundColor: '#F9FAFB',
                                },
                                '&:disabled': {
                                  backgroundColor: '#F3F4F6',
                                  opacity: 0.5,
                                },
                              }}
                            >
                              <RemoveIcon sx={{ fontSize: '16px', color: '#6B7280' }} />
                            </IconButton>
                            <Typography sx={{ 
                              minWidth: '24px', 
                              textAlign: 'center', 
                              fontWeight: 700, 
                              fontSize: '14px',
                              color: '#111827',
                            }}>
                              {qty}
                            </Typography>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(product._id, 1);
                              }}
                              disabled={isOutOfStock}
                              sx={{
                                width: '32px',
                                height: '32px',
                                minWidth: '32px',
                                borderRadius: '8px',
                                backgroundColor: '#10B981',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: '#059669',
                                },
                                '&:disabled': {
                                  backgroundColor: '#D1D5DB',
                                  color: '#9CA3AF',
                                },
                              }}
                            >
                              <AddIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Box>
                        ) : (
                          <button
                            className="add-to-cart-btn-green"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            disabled={isOutOfStock}
                            style={{
                              width: '40px',
                              height: '40px',
                              minWidth: '40px',
                              padding: 0,
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              color: 'white',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                            }}
                            onMouseEnter={(e) => {
                              if (!isOutOfStock) {
                                e.currentTarget.style.backgroundColor = '#059669';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isOutOfStock) {
                                e.currentTarget.style.backgroundColor = '#10B981';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)';
                              }
                            }}
                          >
                            <AddIcon sx={{ fontSize: '22px' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Box>
        )}
      </DialogContent>

      {/* Sticky Bottom Bar - Sepet Özeti */}
      <Box 
        className="order-cart-bar"
        sx={{ 
          position: { xs: 'fixed', md: 'sticky' },
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: '1px solid #E5E7EB',
          padding: { xs: '12px 16px', md: '14px 20px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1.5, md: 2 },
          zIndex: 10,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Sol Taraf - Sepet Bilgisi */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500, 
              color: '#9CA3AF',
              fontSize: '12px',
              lineHeight: 1.2,
            }}
          >
            Sepet ({cartItemCount})
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700, 
              color: '#111827',
              fontSize: { xs: '18px', md: '20px' },
              lineHeight: 1.2,
            }}
          >
            Toplam ₺{total.toFixed(2)}
          </Typography>
        </Box>

        {/* Sağ Taraf - Aksiyon Butonları */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 }, flexShrink: 0 }}>
          <Button 
            onClick={onClose} 
            disabled={submitting}
            variant="outlined"
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              padding: { xs: '8px 16px', md: '10px 18px' },
              borderColor: '#E5E7EB',
              color: '#6B7280',
              backgroundColor: 'transparent',
              fontWeight: 500,
              fontSize: '13px',
              minHeight: '36px',
              '&:hover': {
                backgroundColor: '#F9FAFB',
                borderColor: '#D1D5DB',
                color: '#374151',
              },
            }}
          >
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || cartItemCount === 0}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <AddIcon sx={{ fontSize: '18px' }} />}
            sx={{
              textTransform: 'none',
              borderRadius: '14px',
              height: '44px',
              padding: { xs: '0 20px', md: '0 24px' },
              backgroundColor: '#111827',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              minWidth: { xs: '140px', md: '160px' },
              boxShadow: 'none',
              '&:disabled': {
                backgroundColor: '#D1D5DB',
                color: '#9CA3AF',
                cursor: 'not-allowed',
              },
              '&:hover:not(:disabled)': {
                backgroundColor: '#1F2937',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              },
            }}
          >
            {submitting ? 'Gönderiliyor...' : 'Siparişi Gönder'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
