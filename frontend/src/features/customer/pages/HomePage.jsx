import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useCart } from '../../../shared/context/CartContext.jsx';
import { useNavigate } from 'react-router-dom';
import {
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';
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
  const [flippedCards, setFlippedCards] = useState(new Set());
  const { addToCart, cartItems, branchId } = useCart();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const sentinelRef = useRef(null);
  const categoryScrollRef = useRef(null);
  const socketRef = useRef(null);

  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  // Flip kart toggle - sadece tıklanan kartı flip et, diğerlerini sıfırla
  const toggleFlip = (productId) => {
    setFlippedCards(prev => {
      const newSet = new Set();
      // Eğer tıklanan kart zaten flipped ise sıfırla, değilse sadece onu flip et
      if (!prev.has(productId)) {
        newSet.add(productId);
      }
      return newSet;
    });
  };

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
        // Axios baseURL'i VITE_API_URL'den al
        const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';
        axios.defaults.baseURL = baseURL;
        
        // Public endpoint'leri kullan (authentication gerektirmez)
        const productParams = { page: 1, limit: 500 }; 
        if (branchId) {
          productParams.branchId = branchId;
        }

        const categoryParams = branchId ? { branchId } : {};

        const [prodRes, catRes] = await Promise.all([
          axios.get('/api/products', { params: productParams }),
          axios.get('/api/categories', { params: categoryParams }),
        ]);

        const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.items || [];
        const total = prodRes.data?.total || prodRes.data?.pages || prodList.length;
        
        setAllProducts(prodList);
        setTotalProducts(total);

        const catList = Array.isArray(catRes.data) ? catRes.data : catRes.data?.items || [];
        setCategories(catList);

        setHasMore(prodList.length >= 12);
        setPage(1);
      } catch (err) {
        console.error('Veri çekilirken hata:', err);
        const errorMsg = err.response?.data?.message || err.message || 'Menü yüklenemedi.';
        console.error('🔴 Backend bağlantı hatası:', {
          message: errorMsg,
          hostname: window.location.hostname,
          baseURL: axios.defaults.baseURL,
          status: err.response?.status,
          statusText: err.response?.statusText
        });
        setError(`${errorMsg} Backend: ${axios.defaults.baseURL}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    // Socket.io bağlantısı - Real-time stok güncellemeleri için
    const socketBaseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';

    const socket = io(socketBaseURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Socket bağlantısı başarılı
    });

    // Stok güncellemesi geldiğinde
    socket.on('product:stock:updated', (data) => {
      // Aynı branch'teki ürünse güncelle
      if (!branchId || String(data.branchId) === String(branchId)) {
        setAllProducts(prev => 
          prev.map(product => 
            String(product._id) === String(data.productId)
              ? { ...product, countInStock: data.countInStock }
              : product
          )
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [branchId]);

  // Daha fazla ürün yükle
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      // Axios baseURL'i VITE_API_URL'den al
      const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5001';
      axios.defaults.baseURL = baseURL;
      
      const nextPage = page + 1;
      const params = { page: nextPage, limit: 12 };
      if (branchId) {
        params.branchId = branchId;
      }
      // Public endpoint kullan
      const prodRes = await axios.get('/api/products', { params });
      
      const prodList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.items || [];
      const total = prodRes.data?.total || prodRes.data?.pages || 0;
      
      if (prodList.length > 0) {
        setAllProducts(prev => {
          const newList = [...prev, ...prodList];
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
  }, [page, hasMore, loadingMore, branchId]);

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

  // Kategori scroll için non-passive event listener
  useEffect(() => {
    const scrollElement = categoryScrollRef.current;
    if (!scrollElement) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollElement.scrollLeft += e.deltaY;
      }
    };

    scrollElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      scrollElement.removeEventListener('wheel', handleWheel);
    };
  }, []);

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
      <div className="loading-container">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', width: '100%', maxWidth: '100%' }}>
      {/* Menu Page Container */}
      <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px) clamp(0px, 3vw, 40px)' }}>
        {/* Sticky Menu Header */}
      <div
          id="menu-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: '#fff',
            boxShadow: '0 1px 0 rgba(0,0,0,.06)',
            left: 0,
            right: 0,
            marginBottom: 'clamp(16px, 2vw, 32px)',
            paddingTop: 'clamp(16px, 2.5vw, 24px)',
            paddingBottom: 'clamp(12px, 2vw, 20px)',
            paddingInline: '16px',
          }}
        >
          {/* Başlık */}
          <h2 style={{ marginBottom: '16px', color: '#111827', fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>
            Menümüz
          </h2>
          
          {/* Arama ve Sepet */}
          <div
            id="search-row"
            className="search-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
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
            {/* Sepet Butonu */}
            <div className="cart-badge">
              <button
                onClick={() => navigate('/sepet')}
                aria-label="Sepet"
                className="cart-btn"
              >
                <ShoppingCartOutlinedIcon className="cart-btn-icon" />
                {isDesktop && <span>Sepet</span>}
              </button>
              {cartCount > 0 && (
                <span className="cart-badge-count">{cartCount}</span>
              )}
            </div>
          </div>

          {/* Category Filters - Horizontal Scrollable Pill Strip */}
          <div
            ref={categoryScrollRef}
            className="chip-scroll"
            style={{
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%',
              scrollPaddingInline: '16px',
              paddingInline: '16px',
              marginLeft: '-16px',
              marginRight: '-16px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                gap: '8px',
                paddingTop: '4px',
                paddingBottom: '4px',
                alignItems: 'center',
                flexWrap: 'nowrap',
                minWidth: 'max-content',
              }}
            >
              {categoryNames.map((catName) => (
                <button
                  key={catName}
                  className={`category-chip ${activeCategory === catName ? 'active' : ''}`}
                  onClick={() => setActiveCategory(catName)}
                >
                  {catName}
                </button>
              ))}
        </div>
      </div>
        </div>

        {error && (
          <div className="error-alert" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* Toplam Ürün Sayısı Rozeti */}
        {products.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '999px',
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              border: '1px solid #e5e7eb',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}>
              {products.length} ürün
            </span>
          </div>
        )}

        {/* Menu Items Grid */}
        {products.length === 0 && !loading ? (
          <div className="empty-state">
            <p>Seçtiğiniz kriterlere uygun ürün bulunamadı.</p>
          </div>
        ) : (
          <div className="products-container">
            {products.map((product) => {
              const imageUrl = product.imageUrl || PLACEHOLDER_IMAGE;
              const isOutOfStock = (product.countInStock ?? 0) <= 0;
              const price = Number(product.price) || 0;
              const isFlipped = flippedCards.has(product._id);

              // Kategori bazlı etiket belirleme
              const getProductBadge = () => {
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

              const productBadge = getProductBadge();

              return (
                <div 
                  key={product._id} 
                  className={`product-card ${isFlipped ? 'flipped' : ''}`}
                  onClick={() => toggleFlip(product._id)}
                >
                  <div className="product-card-inner">
                    {/* Ön Yüz */}
                    <div className="product-card-front">
                      <div className="product-image-wrapper">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="product-image"
                          loading="lazy"
                          onError={handleImageError}
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

                      <div className="product-card-content">
                        <h3 className="product-name">{product.name}</h3>

                        <div className="product-front-footer">
                          <p className="product-price-green">₺{price.toFixed(0)}</p>
                          <button
                            className="add-to-cart-btn-green"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                            disabled={isOutOfStock}
                          >
                          <AddIcon className="add-to-cart-btn-icon" />
                          <span className="add-to-cart-btn-text">Sepete Ekle</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Arka Yüz */}
                    <div className="product-card-back">
                      <div className="product-card-back-content">
                        <h3 className="product-back-name">{product.name}</h3>

                        <div className="product-back-section">
                          <h4 className="product-back-section-title">Açıklama</h4>
                          <p className="product-back-description">
                            {product.description || 'Açıklama bulunmuyor.'}
                          </p>
                        </div>

                        <div className="product-back-section">
                          <div className="product-back-time-wrapper">
                            <AccessTimeIcon className="product-back-time-icon" />
                            <span className="product-back-time-text">
                              <span className="product-back-time-label-mobile">Hazırlanma: </span>
                              <span className="product-back-time-value">15-20 dk</span>
                            </span>
                          </div>
                        </div>

                        <div className="product-back-tap-hint">
                          Tekrar dokunun
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Sentinel - Sonsuz scroll için */}
            {/* Sonsuz Scroll Tetikleyicisi - Her zaman render edilmeli (hasMore varsa) */}
            {hasMore && (
              <div
                id="sentinel"
                ref={sentinelRef}
                style={{
                  width: '100%',
                  height: '20px', // Biraz yükseklik verelim ki kolay algılansın
                  gridColumn: '1 / -1',
                  marginTop: '20px',
                  pointerEvents: 'none', // Tıklamaları engelle
                }}
              />
            )}

            {/* Yükleniyor İkonu - Sentinel'den bağımsız gösterilmeli */}
            {loadingMore && (
              <div style={{ 
                gridColumn: '1 / -1', 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '20px' 
              }}>
                <CircularProgress size={30} />
              </div>
            )}
          </div>
        )}
        
        {/* Hata Durumunda Retry Butonu */}
        {error && products.length > 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div className="error-alert" style={{ marginBottom: '16px' }}>
              {error}
            </div>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                backgroundColor: '#333',
                color: '#fff',
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '1rem',
              }}
              onMouseOver={(e) => !loadingMore && (e.target.style.backgroundColor = '#555')}
              onMouseOut={(e) => !loadingMore && (e.target.style.backgroundColor = '#333')}
            >
              Tekrar Dene
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
