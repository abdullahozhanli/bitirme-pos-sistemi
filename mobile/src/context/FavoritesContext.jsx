import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

function keyV2(userId) {
  return `selfkasa_favorites_v2_${String(userId || 'guest')}`;
}

function keyV1(userId) {
  return `selfkasa_favorites_v1_${String(userId || 'guest')}`;
}

/** Şube anahtarı: boş = şube bilgisi yok (eski kayıtlar dahil) */
export function normalizeFavoriteBranchId(b) {
  if (b == null || b === '') return '';
  return String(b);
}

export function favoriteEntryKey(entry) {
  if (!entry?._id) return '';
  return `${normalizeFavoriteBranchId(entry.branchId)}::${String(entry._id)}`;
}

export function productToFavoriteStub(product, branchCtx = {}) {
  if (!product) return null;
  const id = product._id || product.id;
  if (!id) return null;
  const bid =
    branchCtx.branchId != null && String(branchCtx.branchId).trim() !== ''
      ? String(branchCtx.branchId).trim()
      : '';
  const bname = String(branchCtx.branchName || '').trim();
  return {
    _id: String(id),
    name: String(product.name || 'Ürün'),
    price: Number(product.price || product.unitPrice || 0),
    imageUrl: String(product.imageUrl || product.image || ''),
    branchId: bid,
    branchName: bname,
  };
}

export function FavoritesProvider({ children }) {
  const { user, token, ready } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (!token || !user?.id) {
      setFavorites([]);
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(keyV2(user.id));
        if (!raw) {
          const legacy = await AsyncStorage.getItem(keyV1(user.id));
          if (legacy) {
            try {
              const parsed = JSON.parse(legacy);
              if (Array.isArray(parsed)) {
                const migrated = parsed
                  .filter((x) => x && x._id)
                  .map((x) => ({
                    ...x,
                    branchId: x.branchId != null ? String(x.branchId) : '',
                    branchName: String(x.branchName || '').trim(),
                  }));
                raw = JSON.stringify(migrated);
                await AsyncStorage.setItem(keyV2(user.id), raw).catch(() => {});
              }
            } catch {
              /* ignore */
            }
          }
        }
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setFavorites(parsed.filter((x) => x && x._id));
          }
        } else {
          setFavorites([]);
        }
      } catch {
        if (!cancelled) setFavorites([]);
      } finally {
        if (!cancelled) hydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, token, user?.id]);

  useEffect(() => {
    if (!hydrated.current || !token || !user?.id) return;
    AsyncStorage.setItem(keyV2(user.id), JSON.stringify(favorites)).catch(() => {});
  }, [favorites, token, user?.id]);

  const favKeySet = useMemo(
    () => new Set(favorites.map((f) => favoriteEntryKey(f)).filter(Boolean)),
    [favorites]
  );

  const isFavorite = useCallback(
    (productId, branchId) => {
      const stubKey = favoriteEntryKey({
        _id: productId,
        branchId: normalizeFavoriteBranchId(branchId),
      });
      return favKeySet.has(stubKey);
    },
    [favKeySet]
  );

  const toggleFavorite = useCallback((product, branchCtx = {}) => {
    const stub = productToFavoriteStub(product, branchCtx);
    if (!stub) return;
    const k = favoriteEntryKey(stub);
    setFavorites((prev) => {
      const exists = prev.some((p) => favoriteEntryKey(p) === k);
      if (exists) return prev.filter((p) => favoriteEntryKey(p) !== k);
      return [...prev, stub];
    });
  }, []);

  const removeFavorite = useCallback((productId, branchId) => {
    const k = favoriteEntryKey({
      _id: productId,
      branchId: normalizeFavoriteBranchId(branchId),
    });
    setFavorites((prev) => prev.filter((p) => favoriteEntryKey(p) !== k));
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      removeFavorite,
    }),
    [favorites, isFavorite, toggleFavorite, removeFavorite]
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites FavoritesProvider içinde olmalı');
  return ctx;
}
