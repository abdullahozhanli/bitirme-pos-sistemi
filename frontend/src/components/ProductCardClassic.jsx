import React, { useState } from 'react';
import './ProductCardClassic.css';

export default function ProductCardClassic({ product, onAdd }) {
  const [size, setSize] = useState('medium');

  const deltas = { small: -5, medium: 0, large: 8 };
  const finalPrice = Math.max(0, Number(product.price) + deltas[size]);
  const isOutOfStock = (product.countInStock ?? 0) <= 0;

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
  
  const getImageUrl = () => {
    if (product.imageUrl) {
      return product.imageUrl;
    }
    const categoryName = product.category?.name || '';
    return FALLBACK_IMAGES[categoryName] || PLACEHOLDER_IMAGE;
  };
  
  const imageUrl = getImageUrl();

  const handleAddToCart = () => {
    onAdd(product, size);
  };

  return (
    <div className="pcard">
      <div className="pcard__imgwrap">
        <img 
          src={imageUrl} 
          alt={product.name} 
          className="pcard__img"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
        />
        {isOutOfStock && (
          <div className="pcard__soldout">TÜKENDİ</div>
        )}
      </div>

      <div className="pcard__body">
        <div className="pcard__row" style={{ marginBottom: '8px' }}>
          <h4 className="pcard__title">{product.name}</h4>
          <span className="pcard__price">{finalPrice.toFixed(2)}₺</span>
        </div>

        <p className="pcard__desc">{product.description || ''}</p>

        <div className="pcard__chips">
          <span className="pcard__chip pcard__chip--hot">Sıcak</span>
          <span className="pcard__chip pcard__chip--popular">Popüler</span>
        </div>

        <div className="pcard__meta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>5 dk</span>
        </div>

        <p className="pcard__allergen">Alerjenler: Süt Ürünleri</p>

        <div className="pcard__sizes">
          <button
            className={`pcard__size ${size === 'small' ? 'is-active' : ''}`}
            onClick={() => setSize('small')}
            disabled={isOutOfStock}
          >
            Küçük –5.00₺
          </button>
          <button
            className={`pcard__size ${size === 'medium' ? 'is-active' : ''}`}
            onClick={() => setSize('medium')}
            disabled={isOutOfStock}
          >
            Orta
          </button>
          <button
            className={`pcard__size ${size === 'large' ? 'is-active' : ''}`}
            onClick={() => setSize('large')}
            disabled={isOutOfStock}
          >
            Büyük +8.00₺
          </button>
        </div>

        <button
          className="pcard__cta"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          Sepete Ekle
        </button>
      </div>
    </div>
  );
}


