import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  homeFonts,
  pressScale,
  androidRipple,
} from '../constants/homeTheme';
import { useTableSession } from '../context/TableSessionContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';

import client from '../api/client';

const PALETTE = {
  pageBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#1F2933',
  textSecondary: '#7A7168',
  textBody: '#7A7168',
  border: '#E8E0D6',
  accent: '#FFC107',
  success: '#2E7D32',
  successDark: '#2E7D32',
  campaign: '#4CAF50',
  softGreen: '#F4F9F5',
  softAmber: '#E8F5E9',
  softNeutral: '#FFFEFB',
  btnPrimary: '#4CAF50',
  btnPrimarySoft: '#43A047',
  btnPrimaryText: '#FFFFFF',
  cartBarBg: '#171717',
  cartBarBgPressed: '#000000',
  tagText: '#2E7D32',
  /** Favori dolu kalp — koyu, sıcak, doygun kırmızı (soğuk bordo değil) */
  favoriteHeart: '#B51D1D',
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

const MenuProductCard = memo(function MenuProductCard({
  item,
  onSelect,
  onQuickAdd,
  favorited,
  onToggleFavorite,
}) {
  const pid = String(item._id || item.id || item.name);
  const meta = productCardMeta(item);
  const uri = item.imageUrl || item.image || FALLBACK_IMG;
  return (
    <View style={styles.itemCard}>
      <Pressable
        style={({ pressed }) => [styles.itemPress, pressed && { opacity: 0.96 }]}
        onPress={() => onSelect(item)}
        android_ripple={androidRipple}
      >
        <View style={styles.itemThumbWrap}>
          <Image source={{ uri }} style={styles.itemThumb} resizeMode="cover" />
          {meta.showBadge ? (
            <View style={styles.itemBadge}>
              <Ionicons name="leaf-outline" size={11} color="#FFFFFF" />
            </View>
          ) : null}
          <Pressable
            style={styles.itemThumbFavBtn}
            onPress={() => onToggleFavorite?.(item)}
            hitSlop={6}
          >
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={17}
              color={favorited ? PALETTE.favoriteHeart : PALETTE.textSecondary}
            />
          </Pressable>
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <View style={styles.itemStatsRow}>
            <View style={styles.itemStat}>
              <Ionicons name="star" size={13} color={PALETTE.accent} />
              <Text style={styles.itemStatText}>
                {meta.rating.toFixed(1)}{' '}
                <Text style={styles.itemStatCount}>({meta.count})</Text>
              </Text>
            </View>
            <View style={styles.itemStat}>
              <Ionicons name="time-outline" size={13} color={PALETTE.textSecondary} />
              <Text style={styles.itemStatText}>{meta.prep} dk</Text>
            </View>
          </View>
          <View style={styles.itemFooterBlock}>
            <View style={styles.itemPriceAddRow}>
              <Text style={styles.itemPrice} numberOfLines={1}>
                {formatPrice(item.price)}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.itemAddBtn,
                  pressed && { backgroundColor: '#DCEEDC' },
                ]}
                onPress={() => onQuickAdd(item)}
                hitSlop={6}
              >
                <Text style={styles.itemAddBtnText}>Sepete Ekle</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
});

export default function MenuScreen({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const popularCardWidth = Math.round(windowWidth * 0.445);
  const insets = useSafeAreaInsets();
  const { tableNumber, branchId, branchName, setBranchName } = useTableSession();
  const { addToCart, totals, lines, incrementQty, decrementQty } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favoriteBranchCtx = useMemo(
    () => ({ branchId, branchName }),
    [branchId, branchName]
  );
  const handleToggleFavorite = useCallback(
    (product) => {
      toggleFavorite(product, favoriteBranchCtx);
    },
    [toggleFavorite, favoriteBranchCtx]
  );
  const [activeCat, setActiveCat] = useState('Tum');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [extraSauce, setExtraSauce] = useState(false);
  const [extraCheese, setExtraCheese] = useState(false);

  const categoryScrollRef = useRef(null);
  const categoryLayoutsRef = useRef({});
  const categoryViewportWRef = useRef(0);
  const categoryContentWRef = useRef(0);
  const categoryScrollXRef = useRef(0);

  const selectCategory = useCallback((cat) => {
    setActiveCat(cat);
  }, []);

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
        const nextBranchName = String(res.data?.branchName || '').trim();
        if (nextBranchName) {
          setBranchName(nextBranchName);
        }
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
  }, [branchId, setBranchName]);

  const categories = useMemo(() => {
    const names = products
      .map((p) => p?.category?.name || p?.categoryName || p?.category)
      .filter(Boolean);
    return ['Tum', ...Array.from(new Set(names))];
  }, [products]);

  /**
   * Aktif chip yatayda taşmışsa görünür yap. Tüm chip'ler zaten sığıyorsa scrollTo yok.
   * `categories` tanımından sonra olmalı (aksi halde length hatası / TDZ).
   */
  useLayoutEffect(() => {
    const layout = categoryLayoutsRef.current[activeCat];
    const scroller = categoryScrollRef.current;
    if (!layout || !scroller?.scrollTo) return;

    const viewport = categoryViewportWRef.current;
    const contentW = categoryContentWRef.current;
    if (!viewport || contentW <= viewport + 2) return;

    const scrollX = categoryScrollXRef.current;
    const lead = 12;
    const chipLeft = layout.x;
    const chipRight = layout.x + (layout.width ?? 0);
    const visLeft = scrollX;
    const visRight = scrollX + viewport;

    let targetX = scrollX;
    if (chipLeft < visLeft + lead) {
      targetX = Math.max(0, chipLeft - lead);
    } else if (chipRight > visRight - lead) {
      targetX = Math.max(0, Math.min(chipRight - viewport + lead, contentW - viewport));
    }

    if (Math.abs(targetX - scrollX) > 1) {
      scroller.scrollTo({ x: targetX, animated: false });
    }
  }, [activeCat, categories]);

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
    let pool = products;
    if (activeCat !== 'Tum') {
      pool = products.filter((p) => {
        const catName = p?.category?.name || p?.categoryName || p?.category;
        return catName === activeCat;
      });
    }
    const flagged = pool.filter(
      (p) => p?.featured || p?.isPopular || p?.popular
    );
    if (flagged.length >= 2) return flagged.slice(0, 8);
    return pool.slice(0, 8);
  }, [products, activeCat]);

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

  const quickAdd = useCallback((product) => {
    addToCart(product, { unitPrice: Number(product.price || 0) });
  }, [addToCart]);

  function catLabel(cat) {
    return cat === 'Tum' ? 'Tümü' : cat;
  }

  const showPopular =
    !loading && !loadError && popularProducts.length > 0 && !search;
  const activeCatLabel = activeCat === 'Tum' ? 'Tüm Ürünler' : activeCat;
  const branchDisplayName = useMemo(() => {
    const name = String(branchName || '').trim();
    if (name) return name;

    const rawBranch = String(branchId || '').trim();
    if (!rawBranch) return '';
    if (tableNumber) return '';
    if (rawBranch.length <= 20 && /[a-zA-Z]/.test(rawBranch)) {
      return rawBranch.toUpperCase();
    }
    return '';
  }, [branchId, branchName, tableNumber]);

  const welcomeSection = useMemo(
    () => (
      <View style={styles.welcomeCard}>
        {branchDisplayName ? (
          <Text style={styles.branchSubtitle}>{branchDisplayName}</Text>
        ) : null}
        <View style={styles.heroStatusChip}>
          <Text style={styles.heroStatusText}>Masa {tableNumber || '—'}</Text>
          <Text style={styles.heroStatusDivider}>•</Text>
          <View style={styles.statusDot} />
          <Text style={styles.heroStatusText}>QR ile bağlı</Text>
        </View>

        <View style={styles.assistantCard}>
          <Image
            source={require('../görsel/dal.png')}
            style={styles.assistantBgLeaf}
            resizeMode="contain"
            blurRadius={0.8}
          />
          <View style={styles.assistantTopRow}>
            <View style={styles.assistantTextCol}>
              <Text style={styles.assistantTitle}>Bugün ne sipariş etmek istersiniz?</Text>
              <View style={styles.assistantDescSpacer} />
            </View>
          </View>

          <View style={styles.assistantFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="AI Kalori Asistanı"
              style={({ pressed }) => [
                styles.assistantBtn,
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => navigation.navigate('CalorieEstimate')}
            >
              <LinearGradient
                colors={['#2F8F39', PALETTE.btnPrimary, '#67C96B']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />
              <Text style={styles.assistantBtnText}>AI Kalori Asistanı</Text>
              <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
            </Pressable>

            <View style={styles.searchWrap}>
              <View style={styles.searchIconWrap}>
                <Ionicons
                  name="search"
                  size={18}
                  color="#3F8F4E"
                  style={styles.searchIcon}
                />
              </View>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Menüde ara..."
                placeholderTextColor={PALETTE.textSecondary}
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>
          </View>
        </View>
      </View>
    ),
    [branchDisplayName, tableNumber, search, navigation]
  );

  const popularSectionEl = useMemo(() => {
    if (!showPopular) return null;
    return (
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
            const meta = productCardMeta(item);
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
                  <Pressable
                    style={styles.popularFavBtn}
                    hitSlop={6}
                    onPress={() => handleToggleFavorite(item)}
                  >
                    <Ionicons
                      name={isFavorite(item._id || item.id, branchId) ? 'heart' : 'heart-outline'}
                      size={18}
                      color={
                        isFavorite(item._id || item.id, branchId)
                          ? PALETTE.favoriteHeart
                          : PALETTE.textSecondary
                      }
                    />
                  </Pressable>
                  {meta.showBadge ? (
                    <View style={styles.popularBadge}>
                      <Ionicons
                        name="leaf-outline"
                        size={12}
                        color="#FFFFFF"
                      />
                    </View>
                  ) : null}
                </View>
                <View style={styles.popularBody}>
                  <Text style={styles.popularName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.popularStatsRow}>
                    <View style={styles.popularStat}>
                      <Ionicons
                        name="star"
                        size={13}
                        color={PALETTE.accent}
                      />
                      <Text style={styles.popularStatText}>
                        {meta.rating.toFixed(1)}{' '}
                        <Text style={styles.popularStatCount}>
                          ({meta.count})
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.popularStat}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={PALETTE.textSecondary}
                      />
                      <Text style={styles.popularStatText}>{meta.prep} dk</Text>
                    </View>
                  </View>
                  <View style={styles.popularFooter}>
                    <Text
                      style={styles.popularPrice}
                      numberOfLines={1}
                    >
                      {formatPrice(item.price)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [showPopular, popularProducts, popularCardWidth, isFavorite, branchId, handleToggleFavorite]);

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
          <View style={styles.headerLogoFrame}>
            <Image
              source={require('../görsel/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={Platform.OS === 'android'}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              (totals.count > 0 ? 124 : 36) + insets.bottom,
          },
        ]}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="always"
        {...(Platform.OS === 'ios' ? { delayContentTouches: false } : {})}
      >
        {welcomeSection}

        <View style={styles.stickyCategoriesWrap} collapsable={false}>
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={Platform.OS === 'android'}
            scrollEventThrottle={16}
            onLayout={(e) => {
              categoryViewportWRef.current = e.nativeEvent.layout.width;
            }}
            onContentSizeChange={(w) => {
              categoryContentWRef.current = w;
            }}
            onScroll={(e) => {
              categoryScrollXRef.current = e.nativeEvent.contentOffset.x;
            }}
          >
            {categories.map((cat) => {
              const active = activeCat === cat;
              const onChipLayout = (e) => {
                categoryLayoutsRef.current[cat] = e.nativeEvent.layout;
              };
              if (active) {
                return (
                  <LinearGradient
                    key={cat}
                    colors={['#2F8F39', PALETTE.btnPrimary, '#67C96B']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.catChipActiveGradient}
                    onLayout={onChipLayout}
                  >
                    <Pressable
                      delayPressIn={0}
                      onPress={() => selectCategory(cat)}
                      android_ripple={{
                        ...androidRipple,
                        borderless: false,
                      }}
                      style={({ pressed }) => [
                        styles.catChip,
                        styles.catChipActive,
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      <Text style={[styles.catText, styles.catTextActive]}>
                        {catLabel(cat)}
                      </Text>
                    </Pressable>
                  </LinearGradient>
                );
              }
              return (
                <Pressable
                  key={cat}
                  delayPressIn={0}
                  onLayout={onChipLayout}
                  onPress={() => selectCategory(cat)}
                  android_ripple={{
                    ...androidRipple,
                    borderless: false,
                  }}
                  style={({ pressed }) => [
                    styles.catChip,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Text style={styles.catText}>
                    {catLabel(cat)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {popularSectionEl}

        {!loading && !loadError && filteredProducts.length > 0 ? (
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>{activeCatLabel}</Text>
            <Text style={styles.listCount}>{filteredProducts.length} ürün</Text>
          </View>
        ) : null}

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

        {filteredProducts.map((item) => (
          <MenuProductCard
            key={String(item._id || item.id || item.name)}
            item={item}
            onSelect={setSelectedProduct}
            onQuickAdd={quickAdd}
            favorited={isFavorite(item._id || item.id, branchId)}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </ScrollView>

      {/* Sticky cart bar */}
      {totals.count > 0 ? (
        <View
          style={[styles.cartBarWrap, { bottom: 12 + insets.bottom }]}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={['#2E3238', '#4A515C', '#6A7382']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.cartBarGradient}
          >
            <Pressable
              style={({ pressed }) => [
                styles.cartBar,
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => setShowCartPreview(true)}
              android_ripple={{ color: 'rgba(255,255,255,0.18)', foreground: true }}
            >
              <View style={styles.cartBarLeft}>
                <View style={styles.cartBarIconWrap}>
                  <Ionicons name="bag-handle-outline" size={16} color="#FFFFFF" />
                  <View style={styles.cartBarCount}>
                    <Text style={styles.cartBarCountText}>{totals.count}</Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.cartBarLabel}>Sepetim</Text>
                  <Text style={styles.cartBarPrice} numberOfLines={1}>
                    {formatPrice(totals.sum)}
                  </Text>
                </View>
              </View>
              <View style={styles.cartBarRight}>
                <Text style={styles.cartBarCta}>Sepeti görüntüle</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </View>
            </Pressable>
          </LinearGradient>
        </View>
      ) : null}

      <Modal
        visible={showCartPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCartPreview(false)}
      >
        <View style={styles.cartPreviewBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowCartPreview(false)}
          />
          <LinearGradient
            style={[styles.sheet, styles.cartPreviewSheet, { paddingBottom: 20 + insets.bottom }]}
            colors={['#768292', '#59626F', '#3F454D']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHandle} />
              <Pressable
                style={styles.sheetClose}
                onPress={() => setShowCartPreview(false)}
                hitSlop={10}
                android_ripple={androidRipple}
              >
                <Ionicons name="close" size={20} color="#C7D4F2" />
              </Pressable>
            </View>

            <Text style={styles.cartPreviewTitle}>Sepet Önizleme</Text>
            <Text style={styles.cartPreviewHint}>{totals.count} ürün seçildi</Text>

            <ScrollView
              style={styles.cartPreviewList}
              contentContainerStyle={styles.cartPreviewListContent}
              showsVerticalScrollIndicator={false}
            >
              {lines.map((line, idx) => (
                <View key={`${line._id}-${line.note}-${line.sizeKey}-${idx}`} style={styles.cartPreviewItem}>
                  <View style={styles.cartPreviewItemLeft}>
                    <Text style={styles.cartPreviewItemName} numberOfLines={1}>
                      {line.name}
                    </Text>
                    <Text style={styles.cartPreviewItemMeta}>
                      {line.qty} adet
                      {line.note ? ` • ${line.note}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.cartPreviewItemPrice}>
                    {formatPrice((line.unitPrice ?? line.price ?? 0) * line.qty)}
                  </Text>
                  <View style={styles.cartPreviewItemActions}>
                    <Pressable
                      onPress={() => decrementQty(line)}
                      style={({ pressed }) => [
                        styles.cartQtyBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      hitSlop={6}
                    >
                      <Ionicons name="remove" size={14} color="#FFFFFF" />
                    </Pressable>
                    <Text style={styles.cartQtyText}>{line.qty}</Text>
                    <Pressable
                      onPress={() => incrementQty(line)}
                      style={({ pressed }) => [
                        styles.cartQtyBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      hitSlop={6}
                    >
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.cartPreviewFooter}>
              <Text style={styles.cartPreviewTotalLabel}>Toplam</Text>
              <Text style={styles.cartPreviewTotalValue}>{formatPrice(totals.sum)}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.cartPreviewActionBtn,
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => {
                setShowCartPreview(false);
                navigation.navigate('Cart');
              }}
              android_ripple={{ color: 'rgba(255,255,255,0.18)', foreground: true }}
            >
              <LinearGradient
                colors={['#d1d5db', '#ffffff', '#d1d5db']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="bag-handle-outline" size={18} color="#1f2937" />
              <Text style={styles.cartPreviewActionText}>Sepete Git</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Modal>

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
                  pressed && { backgroundColor: PALETTE.btnPrimarySoft },
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
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

const LIST_CARD_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.045,
  shadowRadius: 9,
  elevation: 2,
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
    paddingTop: 6,
    paddingBottom: 6,
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
  qrIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECE6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  qrGlyphWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrGlyphSparkle: {
    position: 'absolute',
    right: -1,
    bottom: -1,
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
    letterSpacing: -0.4,
  },
  headerLogoFrame: {
    width: 146,
    height: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: PALETTE.pageBg,
    borderBottomWidth: 1,
    borderBottomColor: '#CFCFCF',
  },
  headerLogo: {
    width: 146,
    height: 44,
    opacity: 0.98,
    marginTop: -4,
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.success,
  },
  scroll: { flex: 1 },
  scrollContent: {},

  welcomeCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 14,
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  brandTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 34,
    color: '#1F6B38',
    textAlign: 'center',
    letterSpacing: -0.35,
    marginBottom: 2,
  },
  branchSubtitle: {
    fontFamily: homeFonts.sans,
    fontSize: 20,
    color: '#2E3238',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 24,
    marginBottom: 6,
  },
  heroStatusChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 12,
  },
  heroStatusText: {
    fontFamily: homeFonts.sans,
    fontSize: 15,
    color: '#2E3238',
  },
  heroStatusDivider: {
    fontFamily: homeFonts.sans,
    fontSize: 15,
    color: '#2E3238',
    opacity: 0.7,
  },
  assistantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE9DC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    ...SOFT_SHADOW,
    overflow: 'hidden',
    position: 'relative',
  },
  assistantBgLeaf: {
    position: 'absolute',
    right: -8,
    top: 6,
    width: 172,
    height: 104,
    opacity: 0.9,
    transform: [{ scaleX: 1 }],
    zIndex: 0,
    pointerEvents: 'none',
  },
  assistantTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  assistantTextCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 132,
    zIndex: 1,
  },
  assistantTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 19,
    lineHeight: 27,
    color: '#1F6B38',
    marginBottom: 4,
    letterSpacing: -0.25,
  },
  assistantDescSpacer: {
    height: 29,
  },
  assistantFooter: {
    position: 'relative',
    zIndex: 2,
    alignSelf: 'stretch',
    marginTop: -4,
  },
  assistantBtn: {
    alignSelf: 'flex-start',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  assistantBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#FFFFFF',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FBF8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D7E7D8',
    paddingHorizontal: 10,
    height: 35,
    shadowColor: '#1F2933',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchIcon: { marginTop: 1 },
  searchInput: {
    flex: 1,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: '#1F2933',
    paddingVertical: 0,
  },
  searchFilterBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipActive: {
    backgroundColor: 'transparent',
    borderColor: PALETTE.btnPrimarySoft,
  },
  catChipActiveGradient: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  catText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: '#363636',
    includeFontPadding: false,
  },
  catTextActive: {
    color: '#FFFFFF',
    fontFamily: homeFonts.sansSemi,
  },

  campaignCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F1FAF1',
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
    backgroundColor: '#FFFEFB',
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
    justifyContent: 'flex-start',
    minHeight: 82,
  },
  popularFavBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  popularName: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: PALETTE.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  popularStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  popularStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularStatText: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
  },
  popularStatCount: {
    color: PALETTE.textSecondary,
    fontWeight: '500',
  },
  popularFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  popularPrice: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    letterSpacing: -0.1,
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
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ECE6DC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  itemPress: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 86,
    paddingVertical: 0,
    paddingHorizontal: 0,
    gap: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  itemThumbWrap: {
    width: 82,
    height: 82,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: PALETTE.softNeutral,
    position: 'relative',
  },
  itemThumb: {
    width: 82,
    height: 82,
    backgroundColor: PALETTE.softNeutral,
  },
  itemBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 2,
  },
  itemThumbFavBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
    minHeight: 82,
    paddingVertical: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
    letterSpacing: -0.1,
    paddingRight: 8,
  },
  itemStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  itemStatText: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
  },
  itemStatCount: {
    color: '#777777',
  },
  itemFooterBlock: {
    marginTop: 6,
  },
  itemPriceAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 32,
  },
  itemPrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    fontWeight: '500',
    color: '#3A7F3D',
    letterSpacing: 0,
  },
  itemAddBtn: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemAddBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 11,
    color: '#2E7D32',
  },

  cartBarWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  cartBarGradient: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  cartBar: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  cartBarIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBarCount: {
    position: 'absolute',
    top: -5,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8D9299',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  cartBarCountText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 10,
    color: '#7CFF9A',
  },
  cartBarLabel: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  cartBarPrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
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
  cartPreviewTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: '#F1F5FF',
    marginBottom: 2,
  },
  cartPreviewHint: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: '#AFC0E8',
    marginBottom: 10,
  },
  cartPreviewList: {
    maxHeight: 240,
  },
  cartPreviewListContent: {
    gap: 10,
    paddingBottom: 6,
  },
  cartPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3C507A',
    gap: 10,
  },
  cartPreviewItemLeft: {
    flex: 1,
    minWidth: 0,
  },
  cartPreviewItemName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#E8EEFF',
  },
  cartPreviewItemMeta: {
    marginTop: 2,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: '#AFC0E8',
  },
  cartPreviewItemPrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#D8E4FF',
  },
  cartPreviewItemActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartQtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyText: {
    minWidth: 16,
    textAlign: 'center',
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#FFFFFF',
  },
  cartPreviewFooter: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartPreviewTotalLabel: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: '#B9C9EC',
  },
  cartPreviewTotalValue: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: '#FFFFFF',
  },
  cartPreviewActionBtn: {
    marginTop: 2,
    backgroundColor: 'transparent',
    borderRadius: 999,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  cartPreviewActionText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: '#1f2937',
    letterSpacing: 0.1,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  cartPreviewBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  cartPreviewSheet: {
    backgroundColor: '#1F2A44',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
