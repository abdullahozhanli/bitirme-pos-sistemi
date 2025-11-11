import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Chip,
  Card,
  CardMedia,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
  Badge,
  useMediaQuery,
  useTheme,
  Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import './HomePage.css';

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

export default function HomePage() {
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const { addToCart, cartItems } = useCart();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const sentinelRef = useRef(null);

  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  // Görsel yükleme hatası
  const handleImageError = (e) => {
    e.currentTarget.src = PLACEHOLDER_IMAGE;
  };

  // İlk veri yükleme ve kategori çekme
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [prodRes, catRes] = await Promise.all([
          axios.get('/api/admin/products', { params: { page: 1, limit: 12 } }),
          axios.get('/api/admin/categories'),
        ]);

        const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.items || [];
        const total = prodRes.data?.total || prodRes.data?.pages || prodList.length;
        
        setAllProducts(prodList);
        setTotalProducts(total);
        console.info('products length:', prodList.length);

        const catList = Array.isArray(catRes.data) ? catRes.data : catRes.data?.items || [];
        setCategories(catList);

        setHasMore(prodList.length >= 12);
        setPage(1);
      } catch (err) {
        console.error('Veri çekilirken hata:', err);
        setError(err.response?.data?.message || err.message || 'Menü yüklenemedi. Lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Daha fazla ürün yükle
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const prodRes = await axios.get('/api/admin/products', { params: { page: nextPage, limit: 12 } });
      
      const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.items || [];
      const total = prodRes.data?.total || prodRes.data?.pages || 0;
      
      if (prodList.length > 0) {
        setAllProducts(prev => {
          const newList = [...prev, ...prodList];
          console.info('products length after loadMore:', newList.length);
          return newList;
        });
        setTotalProducts(total);
        setPage(nextPage);
        setHasMore(prodList.length >= 12);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Daha fazla ürün yüklenirken hata:', err);
      setError('Daha fazla ürün yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  // IntersectionObserver ile sonsuz scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // Filtreleme
  const filteredItems = useMemo(() => {
    let filtered = [...allProducts];

    // Kategori filtresi
    if (activeCategory !== 'Tümü') {
      const cat = categories.find(c => c.name === activeCategory);
      if (cat) {
        filtered = filtered.filter(p => p.category?._id === cat._id || p.category?._id === activeCategory);
      }
    }

    // Arama filtresi
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [allProducts, activeCategory, searchTerm, categories]);

  useEffect(() => {
    setProducts(filteredItems);
  }, [filteredItems]);

  const handleAddToCart = (product) => {
    addToCart(product, 'medium');
  };

  // Kategori sıralaması: Tümü, Çerez, Ara Sıcak, Tatlılar, Salatalar, Kahveler, İçecekler, Ana Yemek
  const categoryOrder = ['Tümü', 'Çerez', 'Ara Sıcak', 'Tatlılar', 'Salatalar', 'Kahveler', 'İçecekler', 'Ana Yemek'];
  const categoryNames = useMemo(() => {
    const allCats = ['Tümü', ...categories.map(c => c.name)];
    // Sıralı kategorileri önce koy, sonra diğerlerini ekle
    const ordered = categoryOrder.filter(cat => allCats.includes(cat));
    const others = allCats.filter(cat => !categoryOrder.includes(cat));
    return [...ordered, ...others];
  }, [categories]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8f8f8', minHeight: '100vh', width: '100%', maxWidth: '100%' }}>
      {/* Menu Page Container */}
      <Box sx={{ maxWidth: { xs: '100%', md: 1400 }, width: '100%', mx: 'auto', px: { xs: 0, sm: 3, md: 5 }, py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Sticky Menu Header */}
      <Box
          id="menu-header"
        sx={{
          position: 'sticky',
            top: 0,
            zIndex: 50,
            bgcolor: '#fff',
            boxShadow: '0 1px 0 rgba(0,0,0,.06)',
            left: 0,
            right: 0,
            mb: { xs: 2, sm: 3, md: 4 },
            pt: { xs: 2, sm: 2.5, md: 3 },
            pb: { xs: 1.5, sm: 2, md: 2.5 },
            paddingInline: '16px',
          }}
        >
          {/* Başlık */}
          <Typography variant="h4" component="h2" fontWeight={700} sx={{ mb: 1, color: '#333', fontSize: 'clamp(18px, 2.5vw, 24px)' }}>
            Menümüz
          </Typography>

          {/* Açıklama */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: { xs: 2, sm: 2.5 }, fontSize: 'clamp(12px, 1.8vw, 16px)' }}>
            Yerel kaynaklı malzemelerle taze hazırlanan
          </Typography>

          {/* Search and Cart Row */}
          <Box
            id="search-row"
            className="search-row"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              mb: { xs: 2, sm: 2.5 },
            }}
          >
            <TextField
              placeholder="Menüde ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
                flex: 1,
                minWidth: 0,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#fff',
                  height: '46px',
                  '&:hover fieldset': { borderColor: '#d17a3a' },
                  '&.Mui-focused fieldset': { borderColor: '#d17a3a' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#999' }} />
                  </InputAdornment>
                ),
              }}
            />
            {/* Sepet İkon Butonu */}
            <Badge badgeContent={cartCount > 0 ? cartCount : null} color="error">
              {isDesktop ? (
                <Button
                  onClick={() => navigate('/sepet')}
                  aria-label="Sepet"
                  startIcon={<ShoppingCartIcon />}
                  sx={{
                    flex: '0 0 auto',
                    minWidth: 44,
                    height: 44,
                    borderRadius: 9999,
                    bgcolor: '#333',
                    color: '#fff',
                    px: 1.5,
                    '&:hover': { bgcolor: '#555' },
                    textTransform: 'none',
            fontWeight: 600,
                    fontSize: '0.875rem',
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  Sepet
                </Button>
              ) : (
                <IconButton
                  onClick={() => navigate('/sepet')}
                  aria-label="Sepet"
                  sx={{
                    flex: '0 0 44px',
                    width: 44,
                    height: 44,
                    borderRadius: 9999,
                    bgcolor: '#333',
                    color: '#fff',
                    '&:hover': { bgcolor: '#555' },
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ShoppingCartIcon />
                </IconButton>
              )}
            </Badge>
          </Box>

          {/* Category Filters - Horizontal Scrollable Pill Strip */}
          <Box
            className="chip-scroll"
            sx={{
              overflowX: { xs: 'auto', md: 'visible' },
              whiteSpace: { xs: 'nowrap', md: 'normal' },
              scrollSnapType: { xs: 'x mandatory', md: 'none' },
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%',
              scrollPaddingInline: '16px',
              paddingInline: '16px',
              mx: '-16px',
              // Mobilde scrollbar gizle
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE/Edge
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                gap: { xs: 'clamp(8px, 1.5vw, 12px)', sm: 1.25 },
                py: { xs: 0.5, md: 0 },
                alignItems: 'center',
                flexWrap: 'nowrap',
                minWidth: { xs: 'max-content', md: 'auto' },
              }}
            >
              {categoryNames.map((catName) => (
                <Chip
                  key={catName}
                  className="chip"
                  label={catName}
                  onClick={() => setActiveCategory(catName)}
                  sx={{
                    bgcolor: activeCategory === catName ? '#333' : '#f0f0f0',
                    color: activeCategory === catName ? '#fff' : '#555',
                    border: '1px solid',
                    borderColor: activeCategory === catName ? '#333' : '#ddd',
                    borderRadius: 9999, // Yüksek border-radius (pill)
                    px: { xs: 2, sm: 2.5, md: 3 },
                    py: { xs: 1, sm: 1.25, md: 1.5 },
                    fontSize: 'clamp(12px, 1.8vw, 15px)',
                    fontWeight: activeCategory === catName ? 600 : 500,
                    minHeight: '44px',
                    minWidth: 'fit-content',
              cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0, // Küçülmesin
                    scrollSnapAlign: { xs: 'start', md: 'none' },
                    display: 'inline-flex',
                    // Aktif durum
                    '&:focus-visible': {
                      outline: '2px solid #d17a3a',
                      outlineOffset: '2px',
                    },
                    // Hover durumu
                    '&:hover': {
                      bgcolor: activeCategory === catName ? '#222' : '#e0e0e0',
                      transform: 'scale(1.05)',
                    },
                    // Aktif kategori belirgin
                    ...(activeCategory === catName && {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      transform: 'scale(1.05)',
                    }),
            }}
          />
        ))}
        </Box>
      </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Toplam Ürün Sayısı Rozeti */}
        {products.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Chip
              label={`${products.length} ürün`}
              sx={{
                bgcolor: '#333',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            />
          </Box>
        )}

        {/* Menu Items Grid */}
        {products.length === 0 && !loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
            Seçtiğiniz kriterlere uygun ürün bulunamadı.
            </Typography>
          </Box>
        ) : (
          <Box
            className="product-grid"
            sx={{
              display: 'grid',
              gap: { xs: '12px', sm: '16px' },
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              width: '100%',
              maxWidth: '100%',
            }}
          >
            {products.map((product) => {
              const imageUrl = product.imageUrl || PLACEHOLDER_IMAGE;
              console.log('image url:', product.imageUrl);
              const isOutOfStock = (product.countInStock ?? 0) <= 0;
              const price = Number(product.price) || 0;

              return (
                <Card
                  key={product._id}
                  sx={{
                    borderRadius: 3,
                    overflow: 'visible',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'auto',
                    maxWidth: '100%',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                    },
                  }}
                >
                  <Box 
                    sx={{ 
                      position: 'relative', 
                      width: '100%',
                      overflow: 'hidden', 
                      borderRadius: '12px 12px 0 0',
                    }}
                  >
                    <Box
                      component="img"
                      src={imageUrl}
                      alt={product.name}
                      className="product-image"
                      loading="lazy"
                      onError={handleImageError}
                    />
                    {isOutOfStock && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                        }}
                      >
                        TÜKENDİ
                      </Box>
                    )}
                  </Box>

                  <CardContent sx={{ p: { xs: 'clamp(8px, 2vw, 16px)', sm: 2, md: 2.5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="h6" component="h3" fontWeight={700} sx={{ color: '#333', fontSize: 'clamp(18px, 2.5vw, 22px)' }}>
                        {product.name}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: { xs: 'clamp(16px, 2vw, 20px)', sm: '1.25rem', md: '1.375rem' },
                          fontWeight: 700,
                          color: '#d17a3a',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {price.toFixed(2)}₺
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, lineHeight: 1.6, fontSize: 'clamp(12px, 1.8vw, 16px)', color: '#777' }}
                    >
                      {product.description || 'Açıklama bulunmuyor.'}
                    </Typography>

                    {/* Tags */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, mt: 'auto' }}>
                      {product.category && (
                        <Chip
                          label={product.category.name}
                          size="small"
                          sx={{
                            bgcolor: '#e6e6e6',
                            color: '#555',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            height: 24,
                          }}
                        />
                      )}
                      {isOutOfStock && (
                        <Chip
                          label="Tükendi"
                          size="small"
                          color="error"
                          sx={{ fontSize: '0.75rem', height: 24 }}
                        />
                      )}
                    </Box>

                    {/* Item Info */}
                    <Stack direction="row" spacing={2} sx={{ mt: 1.25, pt: 1.25, borderTop: '1px solid #f0f0f0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem', color: '#888' }}>
                        <AccessTimeIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption">5 dk</Typography>
                      </Box>
                    </Stack>

                    {/* Add to Cart Button */}
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      sx={{
                        mt: 2,
                        bgcolor: '#d17a3a',
                        color: '#fff',
                        py: { xs: 1.5, sm: 1.25 },
                        minHeight: '44px',
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: { xs: 'clamp(14px, 1.8vw, 16px)', sm: '1rem' },
                        '&:hover': { bgcolor: '#b8692f' },
                        '&:disabled': { bgcolor: '#ccc' },
                      }}
                    >
                      Sepete Ekle
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Skeleton Loader - Yüklenirken 4 iskelet kartı */}
            {loadingMore && (
              <>
                {[...Array(4)].map((_, idx) => (
                  <Card key={`skeleton-${idx}`} sx={{ borderRadius: 3, overflow: 'hidden', height: 'auto' }}>
                    <Skeleton variant="rectangular" width="100%" height={200} />
                    <CardContent sx={{ p: 2 }}>
                      <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="40%" height={20} />
                      <Skeleton variant="text" width="100%" height={16} sx={{ mt: 1 }} />
                      <Skeleton variant="rectangular" width="100%" height={44} sx={{ mt: 2, borderRadius: 2 }} />
                    </CardContent>
                  </Card>
                ))}
              </>
        )}
            
            {/* Sentinel - Sonsuz scroll için */}
            {hasMore && !loadingMore && (
              <Box
                id="sentinel"
                ref={sentinelRef}
                sx={{
                  width: '100%',
                  height: '1px',
                  gridColumn: '1 / -1',
                }}
              />
            )}
          </Box>
        )}
        
        {/* Hata Durumunda Retry Butonu */}
        {error && products.length > 0 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={loadMore}
              disabled={loadingMore}
              sx={{
                bgcolor: '#333',
                color: '#fff',
                px: 3,
                py: 1.5,
                minHeight: '44px',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#555' },
              }}
            >
              Tekrar Dene
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
