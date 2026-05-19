import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import SellIcon from '@mui/icons-material/Sell';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ConfirmDialog from '../../../shared/components/ui/ConfirmDialog.jsx';
import { FOOD_PLACEHOLDER, getProductImageUrl } from '../../../shared/lib/mediaUrl.js';
import './CampaignManagementPage.css';

function formatPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0₺';
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}₺`;
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyCartForm = {
  title: '',
  minCartTotal: '',
  discountRatePercent: '',
  isActive: true,
  startsAt: '',
  endsAt: '',
  sortOrder: '0',
};

function ProductGridCard({ product, isSelected, onSelect, multiSelect }) {
  const imgSrc = getProductImageUrl(product);
  const listPrice = Number(product.price) || 0;
  const displayPrice = product.isOnSale
    ? Number(product.effectivePrice ?? product.salePrice ?? listPrice)
    : listPrice;

  return (
    <article
      className={`campaign-product-card${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(product.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(product.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="campaign-product-img-wrap">
        <img
          src={imgSrc}
          alt={product.name}
          className="campaign-product-img"
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== FOOD_PLACEHOLDER) {
              e.currentTarget.src = FOOD_PLACEHOLDER;
            }
          }}
        />
      </div>
      <div className="campaign-product-body">
        <p className="campaign-product-name">{product.name}</p>
        <p className="campaign-product-price">
          {product.isOnSale ? (
            <>
              <span className="campaign-price-strike">{formatPrice(listPrice)}</span>{' '}
              {formatPrice(displayPrice)}
            </>
          ) : (
            formatPrice(listPrice)
          )}
        </p>
        <button
          type="button"
          className={`campaign-add-btn${isSelected ? ' selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product.id);
          }}
        >
          {isSelected ? '✓ Seçildi' : multiSelect ? '+ Ekle' : 'Seç'}
        </button>
      </div>
    </article>
  );
}

export default function CampaignManagementPage() {
  const [mode, setMode] = useState('menu');
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false });

  // Menu mode
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [menuName, setMenuName] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');

  // Product sale mode
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [salePrice, setSalePrice] = useState('');
  const [saleStartsAt, setSaleStartsAt] = useState('');
  const [saleEndsAt, setSaleEndsAt] = useState('');

  // Cart mode
  const [cartForm, setCartForm] = useState(emptyCartForm);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await axios.get('/api/admin/products', { params: { page: 1, limit: 200 } });
      const list = Array.isArray(res.data?.items) ? res.data.items : [];
      setProducts(list.map((p) => ({ id: p._id, ...p })));
    } catch {
      setMessage('Hata: Ürünler yüklenemedi.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoadingCampaigns(true);
      const res = await axios.get('/api/admin/campaigns');
      const list = Array.isArray(res.data?.items) ? res.data.items : [];
      setCampaigns(list.map((c) => ({ id: c._id, ...c })));
    } catch {
      setMessage('Hata: Kampanyalar yüklenemedi.');
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCampaigns();
  }, [fetchProducts, fetchCampaigns]);

  const resetModeForms = useCallback(() => {
    setSelectedIds(new Set());
    setMenuName('');
    setBundlePrice('');
    setSelectedProductId(null);
    setSalePrice('');
    setSaleStartsAt('');
    setSaleEndsAt('');
    setCartForm(emptyCartForm);
  }, []);

  const handleModeChange = (_e, newMode) => {
    if (!newMode) return;
    setMode(newMode);
    resetModeForms();
    setMessage('');
  };

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(String(p.id))),
    [products, selectedIds]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProductId)) || null,
    [products, selectedProductId]
  );

  const listTotal = useMemo(
    () =>
      selectedProducts.reduce((sum, p) => sum + Number(p.price ?? 0), 0),
    [selectedProducts]
  );

  const menuCampaigns = useMemo(
    () => campaigns.filter((c) => c.campaignType === 'menu'),
    [campaigns]
  );

  const cartCampaigns = useMemo(
    () => campaigns.filter((c) => c.campaignType !== 'menu'),
    [campaigns]
  );

  const onSaleProducts = useMemo(
    () => products.filter((p) => p.isOnSale),
    [products]
  );

  const toggleProduct = (productId) => {
    const key = String(productId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const removeProduct = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(productId));
      return next;
    });
  };

  const selectProductForSale = (productId) => {
    const key = String(productId);
    if (selectedProductId === key) {
      setSelectedProductId(null);
      setSalePrice('');
      setSaleStartsAt('');
      setSaleEndsAt('');
      return;
    }
    const p = products.find((x) => String(x.id) === key);
    setSelectedProductId(key);
    if (p) {
      setSalePrice(p.salePrice != null && p.salePrice !== '' ? String(p.salePrice) : '');
      setSaleStartsAt(toDatetimeLocal(p.saleStartsAt));
      setSaleEndsAt(toDatetimeLocal(p.saleEndsAt));
    }
  };

  const loadProductForSaleEdit = (product) => {
    setSelectedProductId(String(product.id));
    setSalePrice(product.salePrice != null ? String(product.salePrice) : '');
    setSaleStartsAt(toDatetimeLocal(product.saleStartsAt));
    setSaleEndsAt(toDatetimeLocal(product.saleEndsAt));
    setMessage('');
  };

  const hasMenuPreview = mode === 'menu' && selectedProducts.length > 0;
  const hasSalePreview = mode === 'productSale' && selectedProduct;

  const listPrice = selectedProduct ? Number(selectedProduct.price) || 0 : 0;
  const saleNum = Number(salePrice);
  const saleSavings =
    selectedProduct && Number.isFinite(saleNum) && saleNum > 0 && saleNum < listPrice
      ? listPrice - saleNum
      : 0;

  const bundleNum = Number(bundlePrice);
  const menuSavings =
    Number.isFinite(bundleNum) && listTotal > 0 && bundleNum < listTotal ? listTotal - bundleNum : 0;

  const handleCreateMenu = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!menuName.trim()) {
      setMessage('Hata: Menü adı girin.');
      return;
    }
    if (selectedProducts.length === 0) {
      setMessage('Hata: En az bir ürün seçin.');
      return;
    }
    const price = Number(bundlePrice);
    if (!Number.isFinite(price) || price <= 0) {
      setMessage('Hata: Geçerli bir kampanya fiyatı girin.');
      return;
    }

    setSaving(true);
    try {
      await axios.post('/api/admin/campaigns', {
        campaignType: 'menu',
        title: menuName.trim(),
        bundlePrice: price,
        products: selectedProducts.map((p) => ({
          productId: p.id,
          name: p.name,
          price: p.price,
          imageUrl: p.imageUrl || '',
        })),
        isActive: true,
      });
      setMessage('Kampanyalı menü oluşturuldu.');
      setMenuName('');
      setBundlePrice('');
      setSelectedIds(new Set());
      await fetchCampaigns();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.response?.data?.msg || 'Kayıt başarısız.';
      setMessage(`Hata: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyProductSale = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setMessage('');

    const sale = Number(salePrice);
    if (!Number.isFinite(sale) || sale <= 0) {
      setMessage('Hata: Geçerli bir indirimli fiyat girin.');
      return;
    }
    if (sale >= listPrice) {
      setMessage('Hata: İndirimli fiyat normal fiyattan düşük olmalı.');
      return;
    }

    setSaving(true);
    try {
      await axios.put(`/api/admin/products/${selectedProduct.id}`, {
        salePrice: sale,
        saleStartsAt: saleStartsAt || null,
        saleEndsAt: saleEndsAt || null,
      });
      setMessage('Ürün indirimi uygulandı.');
      await fetchProducts();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.response?.data?.msg || 'Güncelleme başarısız.';
      setMessage(`Hata: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProductSale = async (productIdOverride) => {
    const targetId = productIdOverride || selectedProduct?.id;
    if (!targetId) return;
    setMessage('');
    setSaving(true);
    try {
      await axios.put(`/api/admin/products/${targetId}`, {
        salePrice: null,
        saleStartsAt: null,
        saleEndsAt: null,
      });
      setMessage('Ürün indirimi kaldırıldı.');
      setSalePrice('');
      setSaleStartsAt('');
      setSaleEndsAt('');
      setSelectedProductId(null);
      await fetchProducts();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.response?.data?.msg || 'Kaldırılamadı.';
      setMessage(`Hata: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async (id) => {
    setMessage('');
    try {
      await axios.delete(`/api/admin/campaigns/${id}`);
      setMessage('Kampanya silindi.');
      await fetchCampaigns();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Silinemedi.';
      setMessage(`Hata: ${errorMsg}`);
    }
  };

  const handleCartFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCartForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateCartCampaign = async (e) => {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      await axios.post('/api/admin/campaigns', {
        campaignType: 'cart',
        title: String(cartForm.title).trim(),
        minCartTotal: Number(cartForm.minCartTotal) || 0,
        discountRate: Number(cartForm.discountRatePercent) / 100,
        isActive: cartForm.isActive !== false,
        startsAt: cartForm.startsAt || null,
        endsAt: cartForm.endsAt || null,
        sortOrder: Number(cartForm.sortOrder) || 0,
      });
      setCartForm(emptyCartForm);
      setMessage('Sepet kampanyası eklendi.');
      await fetchCampaigns();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.response?.data?.msg || 'Kayıt başarısız.';
      setMessage(`Hata: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const renderProductGrid = (multiSelect) => {
    if (loadingProducts) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={36} />
        </Box>
      );
    }
    if (products.length === 0) {
      return (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          Bu şubede henüz ürün yok. Önce ürün ekleyin.
        </Typography>
      );
    }
    return (
      <Box className="campaign-product-grid">
        {products.map((product) => {
          const isSelected = multiSelect
            ? selectedIds.has(String(product.id))
            : String(selectedProductId) === String(product.id);
          return (
            <ProductGridCard
              key={product.id}
              product={product}
              isSelected={isSelected}
              onSelect={multiSelect ? toggleProduct : selectProductForSale}
              multiSelect={multiSelect}
            />
          );
        })}
      </Box>
    );
  };

  const modeTitle =
    mode === 'menu'
      ? 'Kampanyalı Menü Oluştur'
      : mode === 'productSale'
        ? 'Ürün İndirimi'
        : 'Sepet İndirimi Kampanyası';

  return (
    <Box className="campaign-page campaign-page-wrap">
      {message ? (
        <Alert
          severity={message.startsWith('Hata:') ? 'error' : 'success'}
          sx={{ mb: 2, maxWidth: 1280 }}
          onClose={() => setMessage('')}
        >
          {message.replace(/^Hata: /, '')}
        </Alert>
      ) : null}

      <Box className="campaign-mode-toggle">
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          className="campaign-toggle-group"
          sx={{ width: { xs: '100%', md: 'auto' } }}
        >
          <ToggleButton value="menu">
            <RestaurantMenuIcon sx={{ mr: 1, fontSize: 20 }} />
            Kampanyalı Menü
          </ToggleButton>
          <ToggleButton value="productSale">
            <SellIcon sx={{ mr: 1, fontSize: 20 }} />
            Ürün İndirimi
          </ToggleButton>
          <ToggleButton value="cart">
            <ShoppingCartIcon sx={{ mr: 1, fontSize: 20 }} />
            Sepet İndirimi
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ——— MENU MODE ——— */}
      {mode === 'menu' && (
        <>
          <Box component="form" onSubmit={handleCreateMenu} className="campaign-create-card">
            <h1 className="campaign-create-title">{modeTitle}</h1>
            <p className="campaign-section-label">Ürün Seçin</p>

            <Box className={`campaign-builder-layout${hasMenuPreview ? ' has-preview' : ''}`}>
              <Box className="campaign-builder-main">{renderProductGrid(true)}</Box>

              {hasMenuPreview ? (
                <aside className="campaign-preview-panel" aria-label="Menü önizleme">
                  <h2 className="campaign-preview-title">Önizleme</h2>
                  <div className="campaign-preview-box">
                    <div className="campaign-preview-list">
                      {selectedProducts.map((product) => {
                        const imgSrc = getProductImageUrl(product);
                        return (
                          <div key={product.id} className="campaign-preview-item">
                            <img
                              src={imgSrc}
                              alt=""
                              className="campaign-preview-thumb"
                              onError={(e) => {
                                if (e.currentTarget.src !== FOOD_PLACEHOLDER) {
                                  e.currentTarget.src = FOOD_PLACEHOLDER;
                                }
                              }}
                            />
                            <div className="campaign-preview-item-text">
                              <p className="campaign-preview-item-name">{product.name}</p>
                              <p className="campaign-preview-item-price">
                                {formatPrice(product.price)}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="campaign-preview-remove"
                              aria-label={`${product.name} kaldır`}
                              onClick={() => removeProduct(product.id)}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="campaign-preview-total">
                      <span className="campaign-preview-total-label">Toplam Fiyat:</span>
                      <span className="campaign-preview-total-value">{formatPrice(listTotal)}</span>
                    </div>
                  </div>

                  <div className="campaign-preview-form">
                    <div className="campaign-preview-field">
                      <label className="campaign-field-label" htmlFor="menu-name">
                        Menü Adı
                      </label>
                      <input
                        id="menu-name"
                        className="campaign-field-input"
                        placeholder="örn: Kampanyalı Menü 1"
                        value={menuName}
                        onChange={(e) => setMenuName(e.target.value)}
                      />
                    </div>
                    <div className="campaign-preview-field">
                      <label className="campaign-field-label" htmlFor="bundle-price">
                        Kampanya Fiyatı
                      </label>
                      <div className="campaign-price-wrap">
                        <input
                          id="bundle-price"
                          type="number"
                          min="1"
                          step="1"
                          className="campaign-field-input"
                          placeholder="örn: 150"
                          value={bundlePrice}
                          onChange={(e) => setBundlePrice(e.target.value)}
                          style={{ paddingRight: 36 }}
                        />
                        <span className="campaign-price-suffix">₺</span>
                      </div>
                    </div>
                    {menuSavings > 0 ? (
                      <p className="campaign-summary">
                        Müşteri {formatPrice(menuSavings)} tasarruf eder
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      className="campaign-submit-btn campaign-submit-btn--full"
                      disabled={saving || !menuName.trim() || !bundlePrice}
                    >
                      {saving ? (
                        <CircularProgress size={22} sx={{ color: '#fff' }} />
                      ) : (
                        <SaveOutlinedIcon fontSize="small" />
                      )}
                      Menüyü Oluştur
                    </button>
                  </div>
                </aside>
              ) : null}
            </Box>
          </Box>

          <Box className="campaign-list-section">
            <h2 className="campaign-list-title">Oluşturulan kampanyalı menüler</h2>
            {loadingCampaigns ? (
              <CircularProgress size={28} />
            ) : menuCampaigns.length === 0 ? (
              <Typography color="text.secondary">Henüz menü kampanyası yok.</Typography>
            ) : (
              menuCampaigns.map((c) => (
                <Box key={c.id} className="campaign-menu-list-item">
                  <Box>
                    <Typography fontWeight={600}>{c.title}</Typography>
                    <Typography className="campaign-menu-list-meta">
                      {formatPrice(c.bundlePrice)} paket ·{' '}
                      {(c.products || []).map((p) => p.name).join(', ') || '—'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() =>
                      setConfirm({
                        open: true,
                        title: 'Menüyü sil',
                        description: `"${c.title}" silinsin mi?`,
                        onConfirm: () => {
                          setConfirm({ open: false });
                          handleDeleteCampaign(c.id);
                        },
                      })
                    }
                  >
                    Sil
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </>
      )}

      {/* ——— PRODUCT SALE MODE ——— */}
      {mode === 'productSale' && (
        <>
          <Box className="campaign-create-card">
            <h1 className="campaign-create-title">{modeTitle}</h1>
            <p className="campaign-section-label">İndirim uygulanacak ürünü seçin</p>

            <Box className={`campaign-builder-layout${hasSalePreview ? ' has-preview' : ''}`}>
              <Box className="campaign-builder-main">{renderProductGrid(false)}</Box>

              {hasSalePreview ? (
                <aside className="campaign-preview-panel" aria-label="İndirim önizleme">
                  <h2 className="campaign-preview-title">Önizleme</h2>
                  <div className="campaign-preview-box campaign-preview-box--single">
                    <div className="campaign-preview-single-product">
                      <img
                        src={getProductImageUrl(selectedProduct)}
                        alt=""
                        className="campaign-preview-single-img"
                        onError={(e) => {
                          if (e.currentTarget.src !== FOOD_PLACEHOLDER) {
                            e.currentTarget.src = FOOD_PLACEHOLDER;
                          }
                        }}
                      />
                      <p className="campaign-preview-single-name">{selectedProduct.name}</p>
                      <p className="campaign-preview-single-prices">
                        <span className="campaign-price-strike">{formatPrice(listPrice)}</span>
                        {salePrice && Number(salePrice) < listPrice ? (
                          <span className="campaign-preview-sale-arrow">
                            → {formatPrice(saleNum)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <Box
                    component="form"
                    onSubmit={handleApplyProductSale}
                    className="campaign-preview-form"
                  >
                    <div className="campaign-preview-field">
                      <label className="campaign-field-label" htmlFor="sale-price">
                        İndirimli Fiyat
                      </label>
                      <div className="campaign-price-wrap">
                        <input
                          id="sale-price"
                          type="number"
                          min="1"
                          step="0.01"
                          className="campaign-field-input"
                          placeholder="örn: 75"
                          value={salePrice}
                          onChange={(e) => setSalePrice(e.target.value)}
                          style={{ paddingRight: 36 }}
                        />
                        <span className="campaign-price-suffix">₺</span>
                      </div>
                    </div>
                    <div className="campaign-preview-field">
                      <label className="campaign-field-label" htmlFor="sale-start">
                        Başlangıç (isteğe bağlı)
                      </label>
                      <input
                        id="sale-start"
                        type="datetime-local"
                        className="campaign-field-input"
                        value={saleStartsAt}
                        onChange={(e) => setSaleStartsAt(e.target.value)}
                      />
                    </div>
                    <div className="campaign-preview-field">
                      <label className="campaign-field-label" htmlFor="sale-end">
                        Bitiş (isteğe bağlı)
                      </label>
                      <input
                        id="sale-end"
                        type="datetime-local"
                        className="campaign-field-input"
                        value={saleEndsAt}
                        onChange={(e) => setSaleEndsAt(e.target.value)}
                      />
                    </div>
                    {saleSavings > 0 ? (
                      <p className="campaign-summary">
                        %{Math.round((saleSavings / listPrice) * 100)} indirim (
                        {formatPrice(saleSavings)} tasarruf)
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      className="campaign-submit-btn campaign-submit-btn--full"
                      disabled={saving || !salePrice}
                    >
                      {saving ? (
                        <CircularProgress size={22} sx={{ color: '#fff' }} />
                      ) : (
                        <SaveOutlinedIcon fontSize="small" />
                      )}
                      İndirimi Uygula
                    </button>
                    {selectedProduct.isOnSale ? (
                      <button
                        type="button"
                        className="campaign-remove-sale-btn"
                        disabled={saving}
                        onClick={() => void handleRemoveProductSale()}
                      >
                        İndirimi Kaldır
                      </button>
                    ) : null}
                  </Box>
                </aside>
              ) : null}
            </Box>
          </Box>

          <Box className="campaign-list-section">
            <h2 className="campaign-list-title">Aktif ürün indirimleri</h2>
            {loadingProducts ? (
              <CircularProgress size={28} />
            ) : onSaleProducts.length === 0 ? (
              <Typography color="text.secondary">Aktif ürün indirimi yok.</Typography>
            ) : (
              onSaleProducts.map((p) => (
                <Box key={p.id} className="campaign-menu-list-item">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <img
                      src={getProductImageUrl(p)}
                      alt=""
                      className="campaign-preview-thumb"
                      onError={(e) => {
                        if (e.currentTarget.src !== FOOD_PLACEHOLDER) {
                          e.currentTarget.src = FOOD_PLACEHOLDER;
                        }
                      }}
                    />
                    <Box>
                      <Typography fontWeight={600}>{p.name}</Typography>
                      <Typography className="campaign-menu-list-meta">
                        <span className="campaign-price-strike">{formatPrice(p.price)}</span>
                        {' → '}
                        {formatPrice(p.effectivePrice ?? p.salePrice)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => loadProductForSaleEdit(p)}>
                      Düzenle
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => void handleRemoveProductSale(p.id)}
                    >
                      Kaldır
                    </Button>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </>
      )}

      {/* ——— CART MODE ——— */}
      {mode === 'cart' && (
        <>
          <Box className="campaign-create-card">
            <h1 className="campaign-create-title">{modeTitle}</h1>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Minimum sepet tutarına ulaşıldığında uygulanacak yüzde indirim kampanyası.
            </Typography>

            <Box
              component="form"
              onSubmit={handleCreateCartCampaign}
              className="campaign-cart-form"
            >
              <TextField
                label="Başlık"
                name="title"
                value={cartForm.title}
                onChange={handleCartFormChange}
                required
                size="small"
                fullWidth
              />
              <Box className="campaign-form-row campaign-form-row--cart">
                <TextField
                  label="Min. sepet (₺)"
                  name="minCartTotal"
                  type="number"
                  value={cartForm.minCartTotal}
                  onChange={handleCartFormChange}
                  required
                  size="small"
                  fullWidth
                />
                <TextField
                  label="İndirim (%)"
                  name="discountRatePercent"
                  type="number"
                  value={cartForm.discountRatePercent}
                  onChange={handleCartFormChange}
                  required
                  size="small"
                  fullWidth
                  helperText="Örn: 10 = %10"
                />
              </Box>
              <Box className="campaign-form-row campaign-form-row--cart">
                <TextField
                  label="Başlangıç"
                  name="startsAt"
                  type="datetime-local"
                  value={cartForm.startsAt}
                  onChange={handleCartFormChange}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Bitiş"
                  name="endsAt"
                  type="datetime-local"
                  value={cartForm.endsAt}
                  onChange={handleCartFormChange}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <TextField
                label="Sıra"
                name="sortOrder"
                type="number"
                value={cartForm.sortOrder}
                onChange={handleCartFormChange}
                size="small"
                sx={{ maxWidth: 120 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    name="isActive"
                    checked={cartForm.isActive}
                    onChange={handleCartFormChange}
                  />
                }
                label="Aktif"
              />
              <button
                type="submit"
                className="campaign-submit-btn"
                disabled={saving || !cartForm.title.trim()}
              >
                {saving ? (
                  <CircularProgress size={22} sx={{ color: '#fff' }} />
                ) : (
                  <SaveOutlinedIcon fontSize="small" />
                )}
                Kampanya Ekle
              </button>
            </Box>
          </Box>

          <Box className="campaign-list-section">
            <h2 className="campaign-list-title">Sepet indirimi kampanyaları</h2>
            {loadingCampaigns ? (
              <CircularProgress size={28} />
            ) : cartCampaigns.length === 0 ? (
              <Typography color="text.secondary">Henüz sepet kampanyası yok.</Typography>
            ) : (
              cartCampaigns.map((c) => (
                <Box key={c.id} className="campaign-menu-list-item">
                  <Box>
                    <Typography fontWeight={600}>{c.title}</Typography>
                    <Typography className="campaign-menu-list-meta">
                      Min. {formatPrice(c.minCartTotal)} · %
                      {Math.round(Number(c.discountRate || 0) * 100)} indirim
                      {c.isActive === false ? ' · Pasif' : ''}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() =>
                      setConfirm({
                        open: true,
                        title: 'Kampanyayı sil',
                        description: `"${c.title}" silinsin mi?`,
                        onConfirm: () => {
                          setConfirm({ open: false });
                          handleDeleteCampaign(c.id);
                        },
                      })
                    }
                  >
                    Sil
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        onClose={() => setConfirm({ open: false })}
        onConfirm={confirm.onConfirm}
      />
    </Box>
  );
}
