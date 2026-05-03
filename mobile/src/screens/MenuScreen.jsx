import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  homeFonts,
  pressScale,
  androidRipple,
} from '../constants/homeTheme';
import { useTableSession } from '../context/TableSessionContext';
import { useCart } from '../context/CartContext';

import client from '../api/client';

const PALETTE = {
  pageBg: '#F8F7F4',
  cardBg: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textBody: '#4B5563',
  border: '#E5E7EB',
  accent: '#2563EB',
  success: '#16A34A',
  successDark: '#065F46',
  campaign: '#D97706',
  softGreen: '#ECFDF3',
  softAmber: '#FEF3C7',
  softNeutral: '#F3F4F6',
  btnPrimary: '#111827',
  btnPrimaryText: '#FFFFFF',
  tagText: '#92400E',
};

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&q=80';

function hashProductId(id) {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

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

function formatPrice(value) {
  return `₺${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

export default function MenuScreen({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const popularCardWidth = Math.round(windowWidth * 0.445);
  const insets = useSafeAreaInsets();
  const { tableNumber, branchId } = useTableSession();
  const { addToCart, totals } = useCart();
  const [activeCat, setActiveCat] = useState('Tum');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [extraSauce, setExtraSauce] = useState(false);
  const [extraCheese, setExtraCheese] = useState(false);

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
          params: { branchId, inStock: true, limit: 200 },
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
    let list = products;
    if (activeCat !== 'Tum') {
      list = list.filter((p) => {
        const catName = p?.category?.name || p?.categoryName || p?.category;
        return catName === activeCat;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = String(p?.name || '').toLowerCase();
        const desc = String(p?.description || p?.desc || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }
    return list;
  }, [activeCat, products, search]);

  const popularProducts = useMemo(() => {
    const flagged = products.filter(
      (p) => p?.featured || p?.isPopular || p?.popular
    );
    if (flagged.length >= 2) return flagged.slice(0, 8);
    return products.slice(0, 8);
  }, [products]);

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
    addToCart(selectedProduct, {
      unitPrice: base + extras,
      note: extrasNote(),
    });
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

  const showPopular =
    !loading && !loadError && popularProducts.length > 0 && !search;
  const activeCatLabel = activeCat === 'Tum' ? 'Tüm Ürünler' : activeCat;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressScale(pressed)]}
          onPress={() => navigation.goBack()}
          android_ripple={androidRipple}
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={20} color={PALETTE.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Self Kasa
          </Text>
          <View style={styles.headerStatusRow}>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Masa {tableNumber || '—'}
            </Text>
            <Text style={styles.headerDivider}>•</Text>
            <View style={styles.statusDot} />
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              QR ile bağlı
            </Text>
          </View>
        </View>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              (totals.count > 0 ? 124 : 36) + insets.bottom,
          },
        ]}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Welcome + Search */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            Bugün ne sipariş etmek istersiniz?
          </Text>
          <Text style={styles.welcomeDesc}>
            Menüden favori ürünlerinizi seçin.
          </Text>
          <View style={styles.searchWrap}>
            <Ionicons
              name="search"
              size={18}
              color={PALETTE.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Menüde ara..."
              placeholderTextColor={PALETTE.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {search ? (
              <Pressable
                onPress={() => setSearch('')}
                hitSlop={8}
                style={styles.searchClear}
              >
                <Ionicons name="close-circle" size={18} color={PALETTE.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Sticky kategori barı */}
        <View style={styles.stickyCategoriesWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
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
                  <Text
                    style={[styles.catText, active && styles.catTextActive]}
                  >
                    {catLabel(cat)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Kampanya kartı */}
        {!loading && !loadError ? (
          <View style={styles.campaignCard}>
            <View style={styles.campaignBadge}>
              <Text style={styles.campaignBadgeText}>
                MOBİL UYGULAMAYA ÖZEL
              </Text>
            </View>
            <Text style={styles.campaignTitle}>İlk siparişe %20 indirim</Text>
            <Text style={styles.campaignDesc} numberOfLines={2}>
              QR ile bağlandıktan sonra uygulamaya özel fırsatları keşfedin.
            </Text>
          </View>
        ) : null}

        {/* Popüler Ürünler */}
        {showPopular ? (
          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Popüler Ürünler</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {popularProducts.map((item) => {
                const pid = String(item._id || item.id || item.name);
                const uri = item.imageUrl || item.image || FALLBACK_IMG;
                return (
                  <Pressable
                    key={`pop-${pid}`}
                    style={({ pressed }) => [
                      styles.popularCard,
                      { width: popularCardWidth },
                      pressScale(pressed),
                    ]}
                    onPress={() => setSelectedProduct(item)}
                    android_ripple={androidRipple}
                  >
                    <View style={styles.popularImageWrap}>
                      <Image
                        source={{ uri }}
                        style={styles.popularImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.popularBody}>
                      <Text style={styles.popularName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <View style={styles.popularFooter}>
                        <Text
                          style={styles.popularPrice}
                          numberOfLines={1}
                        >
                          {formatPrice(item.price)}
                        </Text>
                        <Pressable
                          style={({ pressed }) => [
                            styles.popularAddBtn,
                            pressed && { backgroundColor: '#1F2937' },
                          ]}
                          onPress={() => quickAdd(item)}
                          hitSlop={6}
                        >
                          <Ionicons name="add" size={22} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Ana ürün listesi başlığı */}
        {!loading && !loadError && filteredProducts.length > 0 ? (
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>{activeCatLabel}</Text>
            <Text style={styles.listCount}>{filteredProducts.length} ürün</Text>
          </View>
        ) : null}

        {/* Loading / error / empty durumları */}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={PALETTE.textPrimary} />
            <Text style={styles.loadingHint}>Menü yükleniyor…</Text>
          </View>
        ) : null}

        {!loading && loadError ? (
          <View style={styles.centerState}>
            <Ionicons
              name="cloud-offline-outline"
              size={36}
              color={PALETTE.textSecondary}
            />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        {!loading && !loadError && filteredProducts.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons
              name="fast-food-outline"
              size={36}
              color={PALETTE.textSecondary}
            />
            <Text style={styles.emptyText}>
              {search ? 'Aramanıza uygun ürün bulunamadı.' : 'Bu kategoride ürün yok.'}
            </Text>
          </View>
        ) : null}

        {/* Ürün listesi */}
        {filteredProducts.map((item) => {
          const pid = String(item._id || item.id || item.name);
          const meta = productCardMeta(item);
          const uri = item.imageUrl || item.image || FALLBACK_IMG;
          return (
            <View key={pid} style={styles.itemCard}>
              <Pressable
                style={({ pressed }) => [
                  styles.itemPress,
                  pressed && { opacity: 0.96 },
                ]}
                onPress={() => setSelectedProduct(item)}
                android_ripple={androidRipple}
              >
                <View style={styles.itemThumbWrap}>
                  <Image
                    source={{ uri }}
                    style={styles.itemThumb}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.itemBody}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {meta.showBadge ? (
                      <View style={styles.itemTag}>
                        <Text style={styles.itemTagText}>Popüler</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description || item.desc || 'Lezzetli seçim'}
                  </Text>
                  <View style={styles.itemFooterBlock}>
                    <View style={styles.itemPriceAddRow}>
                      <Text style={styles.itemPrice} numberOfLines={1}>
                        {formatPrice(item.price)}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.itemAddBtn,
                          pressed && { backgroundColor: '#1F2937' },
                        ]}
                        onPress={() => quickAdd(item)}
                        hitSlop={6}
                      >
                        <Ionicons name="add" size={22} color="#FFFFFF" />
                      </Pressable>
                    </View>
                    <View style={styles.itemMetaRow}>
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={PALETTE.textSecondary}
                      />
                      <Text style={styles.itemMetaText}>{meta.prep} dk</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky cart bar */}
      {totals.count > 0 ? (
        <View
          style={[styles.cartBarWrap, { bottom: 12 + insets.bottom }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={({ pressed }) => [
              styles.cartBar,
              pressed && { backgroundColor: '#1F2937' },
            ]}
            onPress={() => navigation.navigate('Cart')}
            android_ripple={{ color: 'rgba(255,255,255,0.18)', foreground: true }}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBarIconWrap}>
                <Ionicons name="bag-handle-outline" size={18} color="#FFFFFF" />
                <View style={styles.cartBarCount}>
                  <Text style={styles.cartBarCountText}>{totals.count}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.cartBarLabel}>Sepetim</Text>
                <Text style={styles.cartBarPrice}>
                  {totals.count} ürün • {formatPrice(totals.sum)}
                </Text>
              </View>
            </View>
            <View style={styles.cartBarRight}>
              <Text style={styles.cartBarCta}>Sepete git</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      ) : null}

      {/* Ürün detay modal */}
      <Modal
        visible={Boolean(selectedProduct)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedProduct(null)}
          />
          {selectedProduct ? (
            <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
              <View style={styles.sheetHeaderRow}>
                <View style={styles.sheetHandle} />
                <Pressable
                  style={styles.sheetClose}
                  onPress={() => setSelectedProduct(null)}
                  hitSlop={10}
                  android_ripple={androidRipple}
                >
                  <Ionicons name="close" size={20} color={PALETTE.textSecondary} />
                </Pressable>
              </View>
              <Image
                source={{
                  uri:
                    selectedProduct.imageUrl ||
                    selectedProduct.image ||
                    FALLBACK_IMG,
                }}
                style={styles.sheetImage}
                resizeMode="cover"
              />
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetTitle}>{selectedProduct.name}</Text>
                <Text style={styles.sheetPrice}>
                  {formatPrice(selectedProduct.price)}
                </Text>
              </View>
              <Text style={styles.sheetDesc}>
                {selectedProduct.description ||
                  selectedProduct.desc ||
                  'Lezzetli seçim'}
              </Text>

              <Text style={styles.extrasTitle}>EKSTRALAR</Text>
              <Pressable
                style={styles.extraRow}
                onPress={() => setExtraSauce((v) => !v)}
                android_ripple={androidRipple}
              >
                <Text style={styles.extraLabel}>Özel sos (+₺19,90)</Text>
                <Ionicons
                  name={extraSauce ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={extraSauce ? PALETTE.textPrimary : PALETTE.textSecondary}
                />
              </Pressable>
              <Pressable
                style={styles.extraRow}
                onPress={() => setExtraCheese((v) => !v)}
                android_ripple={androidRipple}
              >
                <Text style={styles.extraLabel}>Ekstra peynir (+₺24,90)</Text>
                <Ionicons
                  name={extraCheese ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={extraCheese ? PALETTE.textPrimary : PALETTE.textSecondary}
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.sheetAddBtn,
                  pressed && { backgroundColor: '#1F2937' },
                ]}
                onPress={confirmAddFromSheet}
                android_ripple={{ color: 'rgba(255,255,255,0.18)', foreground: true }}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.sheetAddText}>Sepete ekle</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SOFT_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 2,
};

const LIST_CARD_SHADOW = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.03,
  shadowRadius: 8,
  elevation: 1,
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.border,
  },
  iconBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PALETTE.success,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: PALETTE.pageBg,
  },
  cartBadgeText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 10,
    color: '#FFFFFF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: PALETTE.textPrimary,
    letterSpacing: -0.3,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.success,
  },
  headerSubtitle: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: PALETTE.textSecondary,
  },
  headerDivider: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: PALETTE.textSecondary,
    opacity: 0.6,
    marginHorizontal: 1,
  },

  scroll: { flex: 1 },
  scrollContent: {},

  welcomeCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: PALETTE.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...SOFT_SHADOW,
  },
  welcomeTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: PALETTE.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  welcomeDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: PALETTE.textSecondary,
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.softNeutral,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: PALETTE.textPrimary,
    paddingVertical: 0,
  },
  searchClear: { paddingLeft: 8 },

  stickyCategoriesWrap: {
    backgroundColor: PALETTE.pageBg,
    paddingTop: 6,
    paddingBottom: 12,
  },
  categoryRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  catChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.cardBg,
    flexShrink: 0,
  },
  catChipActive: {
    backgroundColor: PALETTE.btnPrimary,
    borderColor: PALETTE.btnPrimary,
  },
  catText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: PALETTE.textBody,
    includeFontPadding: false,
  },
  catTextActive: {
    color: '#FFFFFF',
    fontFamily: homeFonts.sansSemi,
  },

  campaignCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: PALETTE.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  campaignBadge: {
    alignSelf: 'flex-start',
    backgroundColor: PALETTE.softAmber,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 4,
  },
  campaignBadgeText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 10,
    color: PALETTE.tagText,
    letterSpacing: 0.4,
  },
  campaignTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: PALETTE.textPrimary,
    marginBottom: 0,
    letterSpacing: -0.2,
  },
  campaignDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: PALETTE.textSecondary,
    marginTop: 4,
  },

  popularSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: PALETTE.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  popularRow: {
    gap: 11,
    paddingHorizontal: 16,
    paddingRight: 28,
  },
  popularCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...LIST_CARD_SHADOW,
  },
  popularImageWrap: {
    width: '100%',
    height: 102,
    backgroundColor: PALETTE.softNeutral,
    overflow: 'hidden',
  },
  popularImage: {
    width: '100%',
    height: '100%',
    backgroundColor: PALETTE.softNeutral,
  },
  popularBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 11,
    flexGrow: 1,
    justifyContent: 'space-between',
    minHeight: 72,
  },
  popularName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    lineHeight: 18,
    color: PALETTE.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  popularFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  popularPrice: {
    flex: 1,
    minWidth: 0,
    fontFamily: homeFonts.sansBold,
    fontSize: 15,
    fontWeight: '800',
    color: PALETTE.textPrimary,
    letterSpacing: -0.25,
  },
  popularAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PALETTE.btnPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  listCount: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: PALETTE.textSecondary,
    paddingBottom: 2,
  },

  centerState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  loadingHint: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: PALETTE.textSecondary,
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
    color: PALETTE.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  itemCard: {
    marginHorizontal: 16,
    marginBottom: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...LIST_CARD_SHADOW,
  },
  itemPress: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 108,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  itemThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: PALETTE.softNeutral,
  },
  itemThumb: {
    width: 80,
    height: 80,
    backgroundColor: PALETTE.softNeutral,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
    minHeight: 80,
    paddingVertical: 0,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontFamily: homeFonts.sansBold,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.28,
  },
  itemTag: {
    backgroundColor: PALETTE.softGreen,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemTagText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 10,
    color: PALETTE.successDark,
    letterSpacing: 0.2,
  },
  itemDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    marginTop: 3,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  itemFooterLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  itemPrice: {
    fontFamily: homeFonts.sansBold,
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  itemMetaText: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: PALETTE.textSecondary,
  },
  itemAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  cartBarWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  cartBar: {
    backgroundColor: PALETTE.btnPrimary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  cartBarIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBarCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PALETTE.success,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: PALETTE.btnPrimary,
  },
  cartBarCountText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 10,
    color: '#FFFFFF',
  },
  cartBarLabel: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  cartBarPrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartBarCta: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#FFFFFF',
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheet: {
    backgroundColor: PALETTE.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 6,
    maxHeight: '88%',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
    minHeight: 32,
    paddingTop: 2,
  },
  sheetHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  sheetClose: {
    position: 'absolute',
    right: -4,
    top: 2,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  sheetImage: {
    width: '100%',
    height: 168,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: PALETTE.softNeutral,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  sheetTitle: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 19,
    color: PALETTE.textPrimary,
    lineHeight: 25,
    letterSpacing: -0.35,
  },
  sheetPrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: PALETTE.textPrimary,
    marginTop: 1,
  },
  sheetDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: PALETTE.textSecondary,
    marginBottom: 14,
  },
  extrasTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 11,
    color: PALETTE.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.border,
  },
  extraLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: PALETTE.textPrimary,
    flex: 1,
    paddingRight: 12,
  },
  sheetAddBtn: {
    marginTop: 16,
    backgroundColor: PALETTE.btnPrimary,
    borderRadius: 999,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  sheetAddText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});
