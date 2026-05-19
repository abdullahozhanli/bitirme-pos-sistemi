/**
 * Ürün / upload görselleri için tam URL (Vite dev'de backend kökü).
 */
export function getBackendOrigin() {
  const fromEnv = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'http://127.0.0.1:5001';
  return '';
}

export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (!u) return '';
  if (/^(https?:|data:)/i.test(u)) return u;
  const path = u.startsWith('/') ? u : `/${u}`;
  const origin = getBackendOrigin();
  return origin ? `${origin}${path}` : path;
}

/** Görsel yüklenemezse kullanılacak genel yemek görseli */
export const FOOD_PLACEHOLDER =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';

export const CATEGORY_FALLBACK_IMAGES = {
  'Ana Yemek': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  'İçecekler': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80',
  'Tatlılar': 'https://images.unsplash.com/photo-1551024506-0bccd828f306?auto=format&fit=crop&w=400&q=80',
  'Salatalar': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
  'Çerez': 'https://images.unsplash.com/photo-1599490659213-e2b9527a213f?auto=format&fit=crop&w=400&q=80',
  'Ara Sıcak': 'https://images.unsplash.com/photo-1606491956689-2ea9aefeeb08?auto=format&fit=crop&w=400&q=80',
  'Kahveler': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80',
};

export function getProductImageUrl(product) {
  if (!product) return FOOD_PLACEHOLDER;
  const raw = String(product.imageUrl || '').trim();
  // Eski /img/... yolları sunucuda yok; kategoriye göre fallback kullan
  if (raw && !raw.startsWith('/img/')) {
    return resolveMediaUrl(raw);
  }
  const categoryName =
    typeof product.category === 'string'
      ? product.category
      : product.category?.name || '';
  return CATEGORY_FALLBACK_IMAGES[categoryName] || FOOD_PLACEHOLDER;
}
