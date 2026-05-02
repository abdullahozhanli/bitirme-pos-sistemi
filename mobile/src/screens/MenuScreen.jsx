import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  menuColors,
  homeFonts,
  pressScale,
  uiShadow,
  androidRipple,
} from '../constants/homeTheme';
import { useTableSession } from '../context/TableSessionContext';
import { useCart } from '../context/CartContext';

import client from '../api/client';

function hashProductId(id) {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** API alanları yoksa yerleşimi korumak için stabil placeholder (ileride avgRating vb. ile değişir). */
function productCardMeta(item) {
  const h = hashProductId(item._id || item.id);
  const rating =
    typeof item.avgRating === 'number'
      ? item.avgRating
      : typeof item.rating === 'number'
        ? item.rating
        : 4.5 + (h % 6) / 10;
  const count =
    typeof item.ratingCount === 'number'
      ? item.ratingCount
      : typeof item.reviewCount === 'number'
        ? item.reviewCount
        : 80 + (h % 420);
  const prep = Number(item.prepTimeMinutes ?? item.prepTime ?? 5) || 5;
  const showBadge = Boolean(item.featured || item.isPopular || item.popular);
  return { rating, count, prep, showBadge };
}

export default function MenuScreen({ navigation }) {
  const { tableNumber, branchId } = useTableSession();
  const { addToCart, totals } = useCart();
  const [activeCat, setActiveCat] = useState('Tum');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [extraSauce, setExtraSauce] = useState(false);
  const [extraCheese, setExtraCheese] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());

  function toggleFavorite(pid) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      if (!branchId) {
        setProducts([]);
        setLoading(false);
        setLoadError('Şube bilgisi bulunamadı. Lütfen QR kodunu tekrar okutun.');
        return;
      }
      setLoading(true);
      setLoadError('');
      try {
        const res = await client.get('/api/products', {
          params: {
            branchId,
            inStock: true,
            limit: 200,
          },
        });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        if (!cancelled) setProducts(items);
      } catch (e) {
        if (!cancelled) {
          setLoadError('Menü yüklenemedi. Lütfen tekrar deneyin.');
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const categories = useMemo(() => {
    const names = products
      .map((p) => p?.category?.name || p?.categoryName || p?.category)
      .filter(Boolean);
    return ['Tum', ...Array.from(new Set(names))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCat === 'Tum') return products;
    return products.filter((p) => {
      const catName = p?.category?.name || p?.categoryName || p?.category;
      return catName === activeCat;
    });
  }, [activeCat, products]);

  function formatPrice(value) {
    return `₺${value.toFixed(2).replace('.', ',')}`;
  }

  function extrasNote() {
    const parts = [];
    if (extraSauce) parts.push('Özel sos');
    if (extraCheese) parts.push('Ekstra peynir');
    return parts.length ? `Ekstra: ${parts.join(', ')}` : '';
  }

  function confirmAddFromSheet() {
    if (!selectedProduct) return;
    const base = Number(selectedProduct.price || 0);
    const extras = (extraSauce ? 19.9 : 0) + (extraCheese ? 24.9 : 0);
    const note = extrasNote();
    addToCart(selectedProduct, { unitPrice: base + extras, note });
    setSelectedProduct(null);
    setExtraSauce(false);
    setExtraCheese(false);
  }

  function quickAdd(product) {
    addToCart(product, { unitPrice: Number(product.price || 0) });
  }

  function catLabel(cat) {
    return cat === 'Tum' ? 'Tümü' : cat;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressScale(pressed)]}
          onPress={() => navigation.goBack()}
          android_ripple={androidRipple}
        >
          <Ionicons name="chevron-back" size={20} color={menuColors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>Menü</Text>
          <Text style={styles.title} numberOfLines={1}>
            Self Kasa
          </Text>
          <View style={styles.tablePill}>
            <Ionicons name="restaurant-outline" size={12} color={menuColors.primaryDark} />
            <Text style={styles.tablePillText}>
              Masa {tableNumber || '—'}
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.cartBtn, pressScale(pressed)]}
          onPress={() => navigation.navigate('Cart')}
          android_ripple={androidRipple}
        >
          <Ionicons name="bag-handle-outline" size={21} color={menuColors.text} />
          {totals.count > 0 ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totals.count > 99 ? '99+' : totals.count}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.stickyCategoriesWrap}>
          <Text style={styles.sectionLabel}>Kategoriler</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((cat) => {
              const active = activeCat === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCat(cat)}
                  android_ripple={androidRipple}
                  style={({ pressed }) => [
                    styles.catChip,
                    active && styles.catChipActive,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Text style={[styles.catText, active && styles.catTextActive]}>{catLabel(cat)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {!loading && !loadError && filteredProducts.length > 0 ? (
          <Text style={styles.sectionLabelUrunler}>Ürünler</Text>
        ) : null}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={menuColors.primary} />
            <Text style={styles.loadingHint}>Menü yükleniyor…</Text>
          </View>
        ) : null}

        {!loading && loadError ? (
          <View style={styles.centerState}>
            <View style={styles.stateIconWrap}>
              <Ionicons name="cloud-offline-outline" size={40} color={menuColors.textMutedLight} />
            </View>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        {!loading && !loadError && filteredProducts.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.stateIconWrap}>
              <Ionicons name="fast-food-outline" size={40} color={menuColors.textMutedLight} />
            </View>
            <Text style={styles.emptyText}>Bu şube için ürün bulunamadı.</Text>
          </View>
        ) : null}

        {filteredProducts.map((item) => {
          const pid = String(item._id || item.id || item.name);
          const meta = productCardMeta(item);
          const fav = favoriteIds.has(pid);
          const uri =
            item.imageUrl ||
            item.image ||
            'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&q=80';
          return (
            <View key={pid} style={[styles.itemCardOuter, styles.itemCardShadow]}>
              <View style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <Pressable
                    style={({ pressed }) => [styles.itemImageCol, pressScale(pressed)]}
                    onPress={() => setSelectedProduct(item)}
                    android_ripple={androidRipple}
                  >
                    <Image source={{ uri }} style={styles.itemThumb} resizeMode="cover" />
                    {meta.showBadge ? (
                      <View style={styles.itemBadge} accessibilityLabel="Öne çıkan">
                        <Ionicons name="ribbon" size={8} color={menuColors.white} />
                      </View>
                    ) : null}
                  </Pressable>
                  <View style={styles.itemBody}>
                    <View style={styles.itemHeadRow}>
                      <Pressable
                        style={({ pressed }) => [styles.itemTitlePress, pressScale(pressed)]}
                        onPress={() => setSelectedProduct(item)}
                        android_ripple={androidRipple}
                      >
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.favBtn, pressScale(pressed), !fav && styles.favBtnDimmed]}
                        onPress={() => toggleFavorite(pid)}
                        hitSlop={8}
                        android_ripple={androidRipple}
                      >
                        <Ionicons
                          name={fav ? 'heart' : 'heart-outline'}
                          size={20}
                          color={fav ? '#E53935' : menuColors.textSecondary}
                        />
                      </Pressable>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.itemMetaPress, pressScale(pressed)]}
                      onPress={() => setSelectedProduct(item)}
                      android_ripple={androidRipple}
                    >
                      <View style={styles.itemMetaRow}>
                        <View style={styles.metaItem}>
                          <Ionicons name="star" size={12} color={menuColors.primary} />
                          <Text style={styles.metaText}>
                            {meta.rating.toFixed(1)} ({meta.count})
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="time-outline" size={12} color={menuColors.textMutedLight} />
                          <Text style={styles.metaText}>{meta.prep} dk</Text>
                        </View>
                      </View>
                    </Pressable>
                    <View style={styles.itemFooterRow}>
                      <Text style={styles.itemPrice}>{formatPrice(Number(item.price || 0))}</Text>
                      <Pressable
                        style={({ pressed }) => [styles.addPill, pressScale(pressed)]}
                        onPress={() => quickAdd(item)}
                        android_ripple={androidRipple}
                      >
                        <Text style={styles.addPillText}>Sepete ekle</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {totals.count > 0 ? (
        <View style={[styles.cartSummary, uiShadow.card]}>
          <View style={styles.cartSummaryLeft}>
            <View style={styles.cartIconCircle}>
              <Ionicons name="bag-handle-outline" size={20} color={menuColors.primaryDark} />
            </View>
            <View>
              <Text style={styles.cartSummaryTop}>{totals.count} ürün</Text>
              <Text style={styles.cartSummaryPrice}>{formatPrice(totals.sum)}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.viewCartBtn, pressScale(pressed)]}
            onPress={() => navigation.navigate('Cart')}
            android_ripple={androidRipple}
          >
            <Text style={styles.viewCartText}>Sepete git</Text>
            <Ionicons name="chevron-forward" size={16} color={menuColors.white} />
          </Pressable>
        </View>
      ) : null}

      <Modal visible={Boolean(selectedProduct)} transparent animationType="slide" onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedProduct(null)} />
          {selectedProduct ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHeaderRow}>
                <View style={styles.sheetHandle} />
                <Pressable
                  style={styles.sheetClose}
                  onPress={() => setSelectedProduct(null)}
                  hitSlop={12}
                  android_ripple={androidRipple}
                >
                  <Ionicons name="close" size={22} color={menuColors.textSecondary} />
                </Pressable>
              </View>
              <Image
                source={{
                  uri:
                    selectedProduct.imageUrl ||
                    selectedProduct.image ||
                    'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&q=80',
                }}
                style={styles.sheetImage}
              />
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetTitle}>{selectedProduct.name}</Text>
                <Text style={styles.sheetPrice}>
                  {formatPrice(Number(selectedProduct.price || 0))}
                </Text>
              </View>
              <Text style={styles.sheetDesc}>
                {selectedProduct.description || selectedProduct.desc || 'Lezzetli seçim'}
              </Text>

              <Text style={styles.extrasTitle}>Ekstralar</Text>
              <Pressable
                style={styles.extraRow}
                onPress={() => setExtraSauce((v) => !v)}
                android_ripple={androidRipple}
              >
                <Text style={styles.extraLabel}>Özel sos (+₺19,90)</Text>
                <Ionicons name={extraSauce ? 'checkbox' : 'square-outline'} size={22} color={menuColors.primaryDark} />
              </Pressable>
              <Pressable
                style={styles.extraRow}
                onPress={() => setExtraCheese((v) => !v)}
                android_ripple={androidRipple}
              >
                <Text style={styles.extraLabel}>Ekstra peynir (+₺24,90)</Text>
                <Ionicons name={extraCheese ? 'checkbox' : 'square-outline'} size={22} color={menuColors.primaryDark} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.sheetAddBtn, pressScale(pressed)]}
                onPress={confirmAddFromSheet}
                android_ripple={androidRipple}
              >
                <Ionicons name="add-circle-outline" size={20} color={menuColors.white} />
                <Text style={styles.sheetAddText}>Sepete ekle</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: menuColors.bg,
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: menuColors.card,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'flex-start',
  },
  headerEyebrow: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: menuColors.textSecondary,
    marginBottom: 2,
  },
  title: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 19,
    color: menuColors.text,
    letterSpacing: -0.2,
  },
  tablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(63,163,77,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(63,163,77,0.18)',
  },
  tablePillText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: menuColors.primaryDark,
  },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: menuColors.card,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: menuColors.bg,
  },
  cartBadgeText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 10,
    color: menuColors.white,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 118,
    gap: 5,
  },
  sectionLabel: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: menuColors.text,
    marginBottom: 8,
    paddingLeft: 2,
  },
  sectionLabelUrunler: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: menuColors.text,
    marginTop: 4,
    marginBottom: 2,
    paddingLeft: 2,
  },
  centerState: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  stateIconWrap: {
    marginBottom: 12,
    opacity: 0.85,
  },
  loadingHint: {
    marginTop: 12,
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.textSecondary,
  },
  errorText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: '#B42318',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  stickyCategoriesWrap: {
    backgroundColor: menuColors.bg,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: menuColors.border,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  categoryRow: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  catChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: menuColors.border,
    backgroundColor: menuColors.card,
  },
  catChipActive: {
    backgroundColor: 'rgba(63,163,77,0.14)',
    borderColor: 'rgba(46,125,50,0.35)',
  },
  catText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: menuColors.textSecondary,
  },
  catTextActive: {
    color: menuColors.primaryDark,
    fontFamily: homeFonts.sansSemi,
  },
  itemCardOuter: {
    borderRadius: 12,
    backgroundColor: menuColors.card,
  },
  itemCard: {
    backgroundColor: menuColors.card,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxHeight: 100,
  },
  itemCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
  },
  itemImageCol: {
    width: 70,
    height: 70,
    position: 'relative',
  },
  itemThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: menuColors.bgSoft,
  },
  itemBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: menuColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: menuColors.card,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    minHeight: 70,
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingVertical: 0,
  },
  itemHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },
  itemTitlePress: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  favBtn: {
    padding: 0,
    marginTop: -2,
  },
  favBtnDimmed: {
    opacity: 0.55,
  },
  itemName: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.2,
    color: '#166534',
  },
  itemMetaPress: {
    marginTop: 0,
    alignSelf: 'stretch',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: menuColors.textSecondary,
    lineHeight: 15,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    gap: 6,
  },
  itemPrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.primary,
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  addPill: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    height: 32,
    paddingVertical: 0,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addPillText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: menuColors.primary,
  },
  cartSummary: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 10,
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  cartIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(63,163,77,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartSummaryTop: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  cartSummaryPrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: menuColors.text,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: menuColors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  viewCartText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.white,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: menuColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
    minHeight: 28,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: menuColors.border,
  },
  sheetClose: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  sheetImage: {
    width: '100%',
    height: 176,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: menuColors.bgSoft,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  sheetTitle: {
    flex: 1,
    fontFamily: homeFonts.serifBold,
    fontSize: 20,
    color: menuColors.text,
    lineHeight: 26,
    letterSpacing: 0,
  },
  sheetPrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: menuColors.primaryDark,
    marginTop: 2,
  },
  sheetDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: menuColors.textSecondary,
    marginBottom: 16,
  },
  extrasTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: menuColors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: menuColors.border,
  },
  extraLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: menuColors.text,
    flex: 1,
    paddingRight: 8,
  },
  sheetAddBtn: {
    marginTop: 18,
    backgroundColor: menuColors.primary,
    borderRadius: 16,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheetAddText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: menuColors.white,
  },
});
