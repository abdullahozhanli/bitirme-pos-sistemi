import React from 'react';
import { createContext, useState, useContext, useEffect, useRef } from 'react'; 
import { SIZE_OPTIONS, getSizeMeta } from '../constants/sizeOptions';

const CartContext = createContext();

// --- Başlangıç Durumlarını Hafızadan Okuma Fonksiyonları ---

// 1. Sepeti Hafızadan Oku (Bu zaten vardı)
const getInitialCartState = () => {
  try {
    const storedItems = localStorage.getItem('cartItems');
    return storedItems ? JSON.parse(storedItems) : [];
  } catch (error) {
    console.error("Sepet hafızadan okunurken hata:", error);
    return []; 
  }
};

// 2. YENİ: Masa Numarasını Hafızadan Oku
const getInitialTableNumber = () => {
  try {
    // Tarayıcının hafızasında 'tableNumber' diye bir kayıt ara
    const storedTable = localStorage.getItem('tableNumber');
    // Varsa döndür (bu 'string' "5" gibi), yoksa 'null' (boş) döndür
    return storedTable ? JSON.parse(storedTable) : null;
  } catch (error) {
    console.error("Masa N_ hafızadan okunurken hata:", error);
    return null;
  }
};

// 3. YENİ: Şube ID'sini Hafızadan Oku
const getInitialBranchId = () => {
  try {
    const storedBranch = localStorage.getItem('branchId');
    return storedBranch ? JSON.parse(storedBranch) : null;
  } catch (error) {
    console.error('BranchId hafızadan okunurken hata:', error);
    return null;
  }
};

// --- Ana Sağlayıcı (Provider) ---
export function CartProvider({ children }) {

  // --- DURUMLAR (STATE) ---
  const [cartItems, setCartItems] = useState(getInitialCartState());
  // YENİ: Masa Numarası state'i
  const [tableNumber, setTableNumber] = useState(getInitialTableNumber());
  const [branchId, setBranchId] = useState(getInitialBranchId());
  // Önceki masa numarasını takip etmek için ref
  const prevTableNumberRef = useRef(tableNumber);

  // --- EFEKTLER (EFFECT - Hafızaya Kaydetme) ---

  // Sepet her değiştiğinde hafızaya kaydet (Bu zaten vardı)
  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Sepet hafızaya kaydedilirken hata:", error);
    }
  }, [cartItems]); 

  // YENİ: Masa numarası her değiştiğinde hafızaya kaydet
  useEffect(() => {
    try {
      // 'null' değilse kaydet, 'null' ise hafızadan sil
      if (tableNumber) {
        localStorage.setItem('tableNumber', JSON.stringify(tableNumber));
      } else {
        localStorage.removeItem('tableNumber');
      }
    } catch (error) {
      console.error("Masa N_ hafızaya kaydedilirken hata:", error);
    }
  }, [tableNumber]); // [tableNumber] -> "Sadece 'tableNumber' değiştiğinde bu kodu çalıştır"

  // YENİ: BranchId her değiştiğinde hafızaya kaydet
  useEffect(() => {
    try {
      if (branchId) {
        localStorage.setItem('branchId', JSON.stringify(branchId));
      } else {
        localStorage.removeItem('branchId');
      }
    } catch (error) {
      console.error('BranchId hafızaya kaydedilirken hata:', error);
    }
  }, [branchId]);

  // YENİ: Masa numarası değiştiğinde sepeti temizle
  useEffect(() => {
    const prevTable = prevTableNumberRef.current;
    const currentTable = tableNumber;
    
    // Eğer masa numarası değiştiyse ve önceki masa null değilse sepeti temizle
    if (prevTable !== null && currentTable !== null && prevTable !== currentTable) {
      console.log(`Masa numarası değişti: ${prevTable} -> ${currentTable}. Sepet temizleniyor.`);
      setCartItems([]);
    }
    
    // Önceki masa numarasını güncelle
    prevTableNumberRef.current = currentTable;
  }, [tableNumber]);


  // --- SEPET FONKSİYONLARI (boyut destekli) ---

  const addToCart = (product, sizeKey = 'medium') => {
    const sizeMeta = getSizeMeta(sizeKey);
    const base = Number(product.price);
    const delta = Number(sizeMeta?.delta || 0);
    const unitPrice = base + delta;

    // aynı ürün + aynı boyut varsa adet arttır
    const exist = cartItems.find((item) => item._id === product._id && item.sizeKey === sizeMeta.key);
    if (exist) {
      setCartItems(
        cartItems.map((item) =>
          item._id === product._id && item.sizeKey === sizeMeta.key
            ? { ...exist, qty: exist.qty + 1 }
            : item
        )
      );
      return;
    }

    const newCartItem = {
      _id: product._id,
      name: product.name,
      basePrice: base,
      sizeKey: sizeMeta.key,
      sizeLabel: sizeMeta.label,
      delta,
      unitPrice,
      qty: 1,
      imageUrl: product.imageUrl,
      category: product.category,
    };
    setCartItems([...cartItems, newCartItem]);
  };

  const removeFromCart = (product, sizeKey) => {
    // geriye uyumluluk: eski yapıda sadece _id vardı
    const matcher = (item) =>
      item._id === product._id && (sizeKey ? item.sizeKey === sizeKey : true);

    const exist = cartItems.find(matcher);
    if (!exist) return;
    if (exist.qty === 1) {
      setCartItems(cartItems.filter((item) => !matcher(item)));
    } else {
      setCartItems(
        cartItems.map((item) => (matcher(item) ? { ...exist, qty: exist.qty - 1 } : item))
      );
    }
  };

  // Sepeti Temizleme (Sipariş sonrası)
  const clearCart = () => {
    setCartItems([]); 
    // NOT: Masa numarasını TEMİZLEMİYORUZ,
    // çünkü müşteri aynı masadan yeni sipariş verebilir.
  };

  // --- Değerleri Provider'a Gönderme ---
  return (
    <CartContext.Provider value={{ 
      cartItems, 
      addToCart, 
      removeFromCart, 
      clearCart, 
      tableNumber,        // YENİ: Masa numarasını dışarıya aç
      setTableNumber,     // YENİ: Masa numarasını değiştirecek fonksiyonu dışarıya aç
      branchId,           // YENİ: Şube bilgisini dışarıya aç
      setBranchId         // YENİ: Şube bilgisini değiştirecek fonksiyonu dışarıya aç
    }}>
      {children}
    </CartContext.Provider>
  );
}

// (useCart() kısayolu - Değişiklik yok)
export function useCart() {
  return useContext(CartContext);
}


