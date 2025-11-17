import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMediaQuery, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import './CartPage.css';

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

  // Debug: Masa numarasını kontrol et
  useEffect(() => {
    console.log('CartPage - tableNumber:', tableNumber);
    console.log('CartPage - localStorage tableNumber:', localStorage.getItem('tableNumber'));
  }, [tableNumber]);

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

  const getImageUrl = (item) => {
    if (item.imageUrl) {
      return item.imageUrl;
    }
    const categoryName = item.category?.name || '';
    return FALLBACK_IMAGES[categoryName] || PLACEHOLDER_IMAGE;
  };

  const handleImageError = (e) => {
    e.currentTarget.src = PLACEHOLDER_IMAGE;
  };

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
    <div className="cart-page">
      {message && (
        <div className={`cart-message ${message.includes('Hata') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="cart-empty">
          <p className="cart-empty-text">Sepetiniz şu anda boş.</p>
          <Link to="/" className="cart-back-btn">
            Menüye Dön
          </Link>
        </div>
      ) : (
        <div className="cart-container">
          {/* Sol Panel: Ürünler Listesi */}
          <div className="cart-items-section">
            <div className="cart-header">
              <button 
                className="cart-close-btn" 
                onClick={() => navigate('/')}
                aria-label="Kapat"
              >
                <CloseIcon />
              </button>
              <div className="cart-header-details">
                <h1 className="cart-title">
                  Sepetiniz
                </h1>
                {tableNumber ? (
                  <div className="cart-table-number">
                    Masa: <strong>{tableNumber}</strong>
                  </div>
                ) : (
                  <div className="cart-edit-delivery">
                    <Link to="/qr-scan" style={{ color: '#667eea', textDecoration: 'underline' }}>
                      QR Kod Okut
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="cart-items-list">
              {cartItems.map((item) => {
                const imageUrl = getImageUrl(item);
                return (
                  <div key={`${item._id}-${item.sizeKey}`} className="cart-item-card">
                    <div className="cart-item-image-wrapper">
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="cart-item-image"
                        onError={handleImageError}
                        loading="lazy"
                      />
                    </div>
                    <div className="cart-item-details">
                      <div className="cart-item-header">
                        <h3 className="cart-item-name">{item.name}</h3>
                        <button
                          className="cart-item-delete-btn"
                          onClick={() => {
                            for (let i = 0; i < item.qty; i++) {
                              removeFromCart(item, item.sizeKey);
                            }
                          }}
                          disabled={submitting}
                          aria-label="Ürünü sil"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                      <p className="cart-item-category">
                        {item.category?.name || 'Kategorisiz'} {item.sizeLabel ? `• ${item.sizeLabel}` : ''}
                      </p>
                      <div className="cart-item-footer">
                        <div className="cart-quantity-control">
                          <button
                            className="cart-quantity-btn"
                            onClick={() => removeFromCart(item, item.sizeKey)}
                            disabled={submitting}
                            aria-label="Azalt"
                          >
                            <RemoveIcon />
                          </button>
                          <span className="cart-quantity-value">{item.qty}</span>
                          <button
                            className="cart-quantity-btn"
                            onClick={() => addToCart(item, item.sizeKey)}
                            disabled={submitting}
                            aria-label="Arttır"
                          >
                            <AddIcon />
                          </button>
                        </div>
                        <div className="cart-item-price">
                          <span className="cart-item-price-total">
                            ₺{(item.qty * Number(item.unitPrice ?? item.price)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ Panel: Sipariş Özeti */}
          <div className="cart-summary-section">
            <div className="cart-summary-card">
              <h2 className="cart-summary-title">Sipariş Özeti</h2>
              
              <div className="cart-manage-benefits">
                Manage your benefits
                <span className="arrow-icon">&gt;</span>
              </div>
              
              <div className="cart-summary-items">
                {cartItems.map((item) => (
                  <div key={`${item._id}-${item.sizeKey}`} className="cart-summary-item">
                    <span className="cart-summary-item-name">
                      {item.qty}x {item.name}
                    </span>
                    <span className="cart-summary-item-price">
                      ₺{(item.qty * Number(item.unitPrice ?? item.price)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="cart-summary-total">
                <div className="cart-summary-total-row">
                  <span className="cart-summary-total-label">Toplam:</span>
                  <span className="cart-summary-total-value">₺{calculateTotalPrice().toFixed(2)}</span>
                </div>
              </div>

              <div className="cart-notes">
                <label className="cart-notes-label">Sipariş Notu (Opsiyonel)</label>
                <textarea
                  className="cart-notes-textarea"
                  placeholder="Örn: Soğansız olsun, az acılı..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                className="cart-checkout-button"
                onClick={handleCheckout}
                disabled={submitting || cartItems.length === 0 || !tableNumber}
              >
                {submitting ? 'Gönderiliyor...' : !tableNumber ? 'QR Kodu Okutun' : 'Siparişi Tamamla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sipariş Onay Modal */}
      {orderSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }} onClick={handleCloseSuccessModal}>
          <div className="cart-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-success-modal-title">
              localhost:5173 web sitesinin mesajı
            </div>
            <div className="cart-success-modal-content">
              Siparişiniz alındı. Masa {tableNumber} • ID: ...{orderId}
            </div>
            <div className="cart-success-modal-actions">
              <button className="cart-success-modal-button" onClick={handleCloseSuccessModal}>
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}