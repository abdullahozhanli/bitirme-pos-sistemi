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
import { useTableSession } from './TableSessionContext';

const CART_STORAGE_KEY = 'selfkasa_mobile_cart';

const CartContext = createContext(null);

function sameLine(a, b) {
  return (
    String(a._id) === String(b._id) &&
    (a.note || '') === (b.note || '') &&
    (a.sizeKey || 'default') === (b.sizeKey || 'default')
  );
}

export function CartProvider({ children }) {
  const { token, ready } = useAuth();
  const { tableNumber } = useTableSession();
  const [lines, setLines] = useState([]);
  const prevTableRef = useRef(tableNumber);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setLines([]);
      AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setLines(parsed);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) hydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, token]);

  useEffect(() => {
    if (!hydrated.current || !token) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, token]);

  useEffect(() => {
    const prev = prevTableRef.current;
    if (prev != null && tableNumber != null && prev !== tableNumber) {
      setLines([]);
      AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
    }
    if (prev != null && tableNumber == null) {
      setLines([]);
      AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
    }
    prevTableRef.current = tableNumber;
  }, [tableNumber]);

  const addToCart = useCallback((product, opts = {}) => {
    if (!product) return;
    const id = product._id || product.id;
    if (!id) return;
    const unitPrice =
      opts.unitPrice != null
        ? Number(opts.unitPrice)
        : Number(product.price || product.unitPrice || 0);
    const note = opts.note || '';
    const sizeKey = opts.sizeKey || 'default';
    const addQty = Number(opts.qty) > 0 ? Number(opts.qty) : 1;

    setLines((prev) => {
      const stub = { _id: id, note, sizeKey };
      const idx = prev.findIndex((l) => sameLine(l, stub));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + addQty };
        return next;
      }
      return [
        ...prev,
        {
          _id: id,
          name: product.name || 'Urun',
          imageUrl: product.imageUrl || product.image || '',
          unitPrice,
          price: unitPrice,
          qty: addQty,
          note,
          sizeKey,
          category: product.category,
        },
      ];
    });
  }, []);

  const incrementQty = useCallback((line) => {
    setLines((prev) =>
      prev.map((l) => (sameLine(l, line) ? { ...l, qty: l.qty + 1 } : l))
    );
  }, []);

  const decrementQty = useCallback((line) => {
    setLines((prev) => {
      const next = [];
      for (const l of prev) {
        if (!sameLine(l, line)) {
          next.push(l);
          continue;
        }
        if (l.qty <= 1) continue;
        next.push({ ...l, qty: l.qty - 1 });
      }
      return next;
    });
  }, []);

  const removeLine = useCallback((line) => {
    setLines((prev) => prev.filter((l) => !sameLine(l, line)));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const sum = lines.reduce(
      (s, l) => s + l.qty * Number(l.unitPrice ?? l.price ?? 0),
      0
    );
    return { count, sum: Number(sum.toFixed(2)) };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      addToCart,
      incrementQty,
      decrementQty,
      removeLine,
      clearCart,
      totals,
    }),
    [lines, addToCart, incrementQty, decrementQty, removeLine, clearCart, totals]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart CartProvider içinde olmalı');
  return ctx;
}
