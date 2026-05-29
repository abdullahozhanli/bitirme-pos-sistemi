import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
import { useCart } from '../context/CartContext';
import { useTableSession } from '../context/TableSessionContext';
import { useAuth } from '../context/AuthContext';
import { getLoyaltyPoints } from '../utils/loyaltyPoints';
import client from '../api/client';
import { apiErrorMessage } from '../utils/apiErrorMessage';
import PaymentCardPreview from '../components/PaymentCardPreview';
import AppAlert from '../components/AppAlert';

function formatPrice(value) {
  return `₺${Number(value).toFixed(2).replace('.', ',')}`;
}

function digitsOnly(value, maxLen) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, maxLen);
}

function formatCardNumber(value) {
  const d = digitsOnly(value, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatCardExpiry(value) {
  const d = digitsOnly(value, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function orderStatusLabel(s) {
  const x = String(s || '').toLowerCase();
  const map = {
    hazirlaniyor: 'Hazırlanıyor',
    serviste: 'Serviste',
    tamamlandi: 'Tamamlandı',
    iptal: 'İptal',
    ödendi: 'Ödendi',
  };
  return map[x] || s || '—';
}

function isCardFormValid({ cardHolder, cardNumber, cardExpiry, cardCvv }) {
  const holder = String(cardHolder || '').trim();
  const num = digitsOnly(cardNumber, 19);
  const expiry = String(cardExpiry || '').trim();
  const cvv = digitsOnly(cardCvv, 4);
  if (holder.length < 2) return false;
  if (num.length < 16) return false;
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [mm, yy] = expiry.split('/').map((x) => Number(x));
  if (mm < 1 || mm > 12) return false;
  if (yy < 0 || yy > 99) return false;
  if (cvv.length < 3) return false;
  return true;
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=320&q=80';
const POINT_VALUE_TRY = 0.1;
/** Adet kutusu: sıcak yeşil çerçeve + ikonlar */
const QTY_WARM_GREEN = '#7CB342';

export default function CartScreen({ navigation }) {
  const { lines, incrementQty, decrementQty, clearCart, totals, updateLineNoteAt } = useCart();
  const { tableNumber, branchId, branchName, clearTableSession } = useTableSession();
  const { refreshUser, applyMeToUser, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [campaignKey, setCampaignKey] = useState('none');
  const [usePoints, setUsePoints] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState('');
  const [openNoteIndex, setOpenNoteIndex] = useState(-1);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [showCardSheet, setShowCardSheet] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [appAlert, setAppAlert] = useState(null);
  const [remoteCampaigns, setRemoteCampaigns] = useState([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const orderId = checkoutSuccess?.orderId;
    if (!orderId) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await client.get(`/api/orders/${orderId}`);
        if (!cancelled && res.data?.status) {
          setCheckoutSuccess((prev) =>
            prev ? { ...prev, status: res.data.status } : prev
          );
        }
      } catch {
        /* polling */
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [checkoutSuccess?.orderId]);

  const closeAppAlert = useCallback(() => setAppAlert(null), []);

  const showAppAlert = useCallback((config) => {
    setAppAlert(config);
  }, []);

  const replaceStackWithMenu = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'Menu' }],
      })
    );
  }, [navigation]);

  const finishCheckoutSuccess = useCallback(() => {
    const paidOnline =
      checkoutSuccess?.paymentMethod === 'online' ||
      checkoutSuccess?.paymentStatus === 'paid';
    setCheckoutSuccess(null);
    if (paidOnline) {
      clearTableSession().catch(() => {});
    }
    replaceStackWithMenu();
  }, [replaceStackWithMenu, checkoutSuccess, clearTableSession]);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  useEffect(() => {
    if (!branchId) {
      setRemoteCampaigns([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get('/api/campaigns', {
          params: { branchId: String(branchId) },
        });
        if (!cancelled) {
          setRemoteCampaigns(Array.isArray(res.data?.items) ? res.data.items : []);
        }
      } catch {
        if (!cancelled) setRemoteCampaigns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const points = getLoyaltyPoints(user);
  const redeemablePointsValue = Number((points * POINT_VALUE_TRY).toFixed(2));
  const campaignOptions = useMemo(() => {
    const list = [{ key: 'none', title: 'Kampanya kullanma', rate: 0, minCartTotal: 0 }];
    remoteCampaigns.forEach((c) => {
      list.push({
        key: String(c._id),
        title: c.title,
        rate: Number(c.discountRate) || 0,
        minCartTotal: Number(c.minCartTotal) || 0,
        campaignType: c.campaignType || 'cart',
      });
    });
    return list;
  }, [remoteCampaigns]);

  const campaignChipOptions = useMemo(
    () =>
      campaignOptions.filter(
        (c) => c.key !== 'none' && totals.sum >= Number(c.minCartTotal || 0)
      ),
    [campaignOptions, totals.sum]
  );

  useEffect(() => {
    setCampaignKey((prev) => {
      const valid = campaignOptions.some((c) => c.key === prev);
      if (valid) return prev;
      return campaignOptions[campaignOptions.length - 1]?.key ?? 'none';
    });
  }, [campaignOptions]);

  const activeCampaign = useMemo(
    () => campaignOptions.find((c) => c.key === campaignKey) || campaignOptions[0],
    [campaignKey, campaignOptions]
  );
  const campaignDiscount = useMemo(
    () => Number((totals.sum * (activeCampaign?.rate || 0)).toFixed(2)),
    [totals.sum, activeCampaign]
  );
  const maxPointDiscount = useMemo(
    () => Number((totals.sum * 0.3).toFixed(2)),
    [totals.sum]
  );
  const requestedPointDiscount = useMemo(
    () => Number((points * POINT_VALUE_TRY).toFixed(2)),
    [points]
  );
  const pointsDiscount =
    usePoints && totals.sum > 0
      ? Math.min(
          maxPointDiscount,
          requestedPointDiscount,
          Math.max(0, totals.sum - campaignDiscount - couponDiscount)
        )
      : 0;
  const serviceFee = 0;
  const totalDiscount = Number((campaignDiscount + couponDiscount).toFixed(2));
  const payableTotal = Math.max(
    0,
    Number((totals.sum - campaignDiscount - couponDiscount - pointsDiscount + serviceFee).toFixed(2))
  );

  const branchLabel = String(branchName || '').trim() || 'A Blok Restoran';
  const isOnlinePayment = paymentMethod === 'online';
  const cardFormReady = isCardFormValid({ cardHolder, cardNumber, cardExpiry, cardCvv });

  const closeCardSheet = useCallback(() => {
    setShowCardSheet(false);
    setPaymentMethod((prev) => {
      if (prev === 'online' && !isCardFormValid({ cardHolder, cardNumber, cardExpiry, cardCvv })) {
        return null;
      }
      return prev;
    });
  }, [cardHolder, cardNumber, cardExpiry, cardCvv]);

  const selectPaymentMethod = useCallback(
    (method) => {
      setCheckoutError('');
      if (method === 'online') {
        setPaymentMethod('online');
        setShowCardSheet(true);
        return;
      }
      setPaymentMethod(method);
      setShowCardSheet(false);
    },
    []
  );

  const confirmCardSheet = useCallback(() => {
    if (!isCardFormValid({ cardHolder, cardNumber, cardExpiry, cardCvv })) {
      showAppAlert({
        variant: 'warning',
        title: 'Kart bilgileri',
        message: 'Kart üzerindeki ad, numara, son kullanma ve CVV alanlarını kontrol edin.',
      });
      return;
    }
    setShowCardSheet(false);
  }, [cardHolder, cardNumber, cardExpiry, cardCvv, showAppAlert]);

  function getProductSubtitle(item) {
    const name = String(item?.name || '').toLowerCase();
    if (name.includes('cheeseburger')) return 'Ekstra cheddar, patates, içecek';
    if (name.includes('wrap')) return 'Tavuk, yeşillik, sos, patates, içecek';
    if (name.includes('latte')) return 'Süt, espresso, buz';
    return 'Taze ve günlük hazırlanıyor';
  }

  function applyCoupon() {
    const normalized = String(couponCode || '').trim().toUpperCase();
    if (!normalized) {
      showAppAlert({
        variant: 'info',
        title: 'Kupon',
        message: 'Lütfen kupon kodu girin.',
      });
      return;
    }
    const couponMap = {
      HOSGELDIN10: 0.1,
      SELF5: 0.05,
      MASA7: 0.07,
    };
    const rate = couponMap[normalized];
    if (!rate) {
      setCouponDiscount(0);
      setCouponApplied('');
      showAppAlert({
        variant: 'warning',
        title: 'Kupon geçersiz',
        message: 'Bu kupon kodu kullanılamıyor.',
      });
      return;
    }
    const discount = Number((totals.sum * rate).toFixed(2));
    setCouponDiscount(discount);
    setCouponApplied(normalized);
    showAppAlert({
      variant: 'success',
      title: 'Kupon uygulandı',
      message: `${normalized} ile ${formatPrice(discount)} indiriminiz var.`,
    });
  }

  async function handleCheckout() {
    if (submitting || lines.length === 0) return;
    setCheckoutError('');

    if (couponDiscount > 0.01) {
      const ok = await new Promise((resolve) => {
        showAppAlert({
          variant: 'info',
          title: 'Kupon bilgisi',
          message: `Kupon indirimi (${formatPrice(couponDiscount)}) yalnızca önizlemedir; backend toplamdan düşmez. Not olarak iletilir, restoranda uygulanır.`,
          onCancel: () => resolve(false),
          buttons: [
            { text: 'İptal', onPress: () => resolve(false) },
            { text: 'Devam', primary: true, onPress: () => resolve(true) },
          ],
        });
      });
      if (!ok) return;
    }

    if (!tableNumber) {
      showAppAlert({
        variant: 'warning',
        title: 'Masa gerekli',
        message: 'Sipariş vermek için önce QR ile masayı bağlayın.',
        buttons: [
          { text: 'Tamam' },
          { text: 'QR Tara', primary: true, onPress: () => navigation.navigate('QRScanner') },
        ],
      });
      return;
    }

    if (!paymentMethod) {
      const msg = 'Siparişi tamamlamak için bir ödeme yöntemi seçin.';
      setCheckoutError(msg);
      showAppAlert({
        variant: 'warning',
        title: 'Ödeme yöntemi',
        message: msg,
      });
      return;
    }

    if (isOnlinePayment && !cardFormReady) {
      setCheckoutError('Online ödeme için kart bilgilerini eksiksiz doldurun.');
      showAppAlert({
        variant: 'warning',
        title: 'Kart bilgileri',
        message:
          'Önce kartın ön yüzünü doldurun, ardından kartı çevirip güvenlik kodunu girin.',
        buttons: [
          { text: 'Tamam' },
          {
            text: 'Kartı doldur',
            primary: true,
            onPress: () => setShowCardSheet(true),
          },
        ],
      });
      return;
    }

    setSubmitting(true);
    const methodUsed = paymentMethod;
    try {
      const branchPayload =
        branchId && typeof branchId === 'object' && branchId._id
          ? String(branchId._id)
          : branchId
            ? String(branchId)
            : undefined;

      const orderPayload = {
        tableNumber: String(tableNumber),
        items: lines.map((item) => ({
          menuItemId: item._id,
          productId: item._id,
          qty: item.qty,
          note: String(item.note || '').trim(),
        })),
        notes: [
          activeCampaign?.rate ? `Kampanya: ${activeCampaign.title}` : '',
          couponDiscount > 0 ? `Kupon (${couponApplied}): -${formatPrice(couponDiscount)}` : '',
          pointsDiscount > 0 ? `Para puan: -${formatPrice(pointsDiscount)}` : '',
          paymentMethod === 'table'
            ? 'Odeme yontemi: masada'
            : paymentMethod === 'cashier'
              ? 'Odeme yontemi: kasada'
              : paymentMethod === 'online'
                ? `Odeme yontemi: online (onaylandi, kart ****${digitsOnly(cardNumber, 16).slice(-4)})`
                : '',
        ]
          .filter(Boolean)
          .join(' | '),
        branchId: branchPayload,
        ...(campaignKey && campaignKey !== 'none' ? { campaignId: campaignKey } : {}),
        ...(usePoints && pointsDiscount > 0
          ? {
              useLoyaltyPoints: true,
              pointsDiscountTry: pointsDiscount,
            }
          : {}),
        ...(methodUsed
          ? {
              paymentMethod: methodUsed,
              ...(methodUsed === 'online' ? { paymentConfirmed: true } : {}),
            }
          : {}),
      };

      const res = await client.post('/api/orders', orderPayload);
      const created = res.data;
      const shortId = String(created?._id || '').slice(-6);
      clearCart();
      setUsePoints(false);
      setOpenNoteIndex(-1);
      setCardHolder('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setPaymentMethod(null);
      setShowCardSheet(false);
      if (created?.customerLoyaltyPoints != null) {
        applyMeToUser({
          loyaltyPoints: created.customerLoyaltyPoints,
          points: created.customerLoyaltyPoints,
        });
      } else {
        await refreshUser();
      }
      setCheckoutSuccess({
        orderId: String(created?._id || ''),
        tableNumber: String(tableNumber),
        shortId,
        branchLabel,
        status: created?.status || 'hazirlaniyor',
        paymentMethod: created?.paymentMethod || methodUsed,
        paymentStatus: created?.paymentStatus,
      });
    } catch (err) {
      const message = apiErrorMessage(err, 'Sipariş gönderilemedi.');
      setCheckoutError(message);
      showAppAlert({
        variant: 'error',
        title: 'Sipariş gönderilemedi',
        message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressScale(pressed)]}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={menuColors.text} />
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

      {lines.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Image
            source={require('../görsel/tepsi-clean.png')}
            style={styles.emptyTrayImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Sepetin boş</Text>
          <Text style={styles.emptySub}>
            Menüden ürün ekleyerek siparişini oluşturabilirsin.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressScale(pressed)]}
            onPress={replaceStackWithMenu}
          >
            <Text style={styles.primaryBtnText}>Menüye dön</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.branchCard}>
              <View style={styles.branchLeft}>
                <View style={styles.branchIconWrap}>
                  <Image
                    source={require('../görsel/tepsi-clean.png')}
                    style={styles.branchIconImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.branchTextWrap}>
                  <Text style={styles.branchName}>{branchLabel}</Text>
                  <Text style={styles.branchTable}>
                    Masa {tableNumber != null && tableNumber !== '' ? tableNumber : '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Aktif</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Siparişini kontrol et, ürün notlarını ekle ve siparişi tamamla.
              </Text>
            </View>

            {lines.map((item, index) => (
              <View
                key={`cart-line-${index}-${String(item._id)}-${item.sizeKey || 'd'}`}
                style={styles.lineCard}
              >
                <View style={styles.lineUpper}>
                  <Image
                    source={{ uri: item.imageUrl || FALLBACK_IMG }}
                    style={styles.lineImage}
                    resizeMode="cover"
                  />
                  <View style={styles.lineInfo}>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.lineDesc} numberOfLines={1}>
                      {getProductSubtitle(item)}
                    </Text>
                    <Text style={styles.linePrice}>
                      {formatPrice(item.qty * Number(item.unitPrice ?? item.price ?? 0))}
                    </Text>
                  </View>
                </View>

                <View style={styles.lineBottomRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.noteRowBtn,
                      pressed && styles.noteRowBtnPressed,
                    ]}
                    onPress={() =>
                      setOpenNoteIndex((prev) => (prev === index ? -1 : index))
                    }
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
                  >
                    <Ionicons
                      name={openNoteIndex === index ? 'chevron-up' : 'chatbubble-ellipses-outline'}
                      size={12}
                      color={item.note?.trim() ? menuColors.primaryDark : '#757575'}
                    />
                    <Text
                      style={[
                        styles.noteRowBtnText,
                        item.note?.trim() && styles.noteRowBtnTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {openNoteIndex === index
                        ? 'Notu gizle'
                        : item.note?.trim()
                          ? 'Notu düzenle'
                          : 'Ürün notu ekle'}
                    </Text>
                  </Pressable>
                  <View style={styles.lineBottomSpacer} />
                  <View style={styles.qtyPill}>
                    <Pressable
                      style={styles.qtyBtnGhost}
                      onPress={() => decrementQty(item)}
                      disabled={submitting}
                      hitSlop={8}
                    >
                      <Ionicons name="remove" size={14} color={QTY_WARM_GREEN} />
                    </Pressable>
                    <Text style={styles.qtyVal}>{item.qty}</Text>
                    <Pressable
                      style={styles.qtyBtnGhost}
                      onPress={() => incrementQty(item)}
                      disabled={submitting}
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={14} color={QTY_WARM_GREEN} />
                    </Pressable>
                  </View>
                </View>

                {(openNoteIndex === index || item.note?.trim()) ? (
                <View style={styles.lineNoteSection}>
                  {openNoteIndex === index ? (
                    <TextInput
                      style={styles.lineNoteInput}
                      placeholder="Örn: Soğansız, az acılı..."
                      placeholderTextColor={menuColors.textMutedLight}
                      value={item.note || ''}
                      onChangeText={(v) => updateLineNoteAt(index, v)}
                      multiline
                      editable={!submitting}
                      autoFocus
                      textAlignVertical="top"
                    />
                  ) : (
                    <Pressable
                      style={styles.lineNoteCollapsed}
                      onPress={() => setOpenNoteIndex(index)}
                      disabled={submitting}
                    >
                      <Text style={styles.lineNotePreview} numberOfLines={3}>
                        {item.note.trim()}
                      </Text>
                      <Text style={styles.lineNoteEditHint}>Düzenlemek için dokun</Text>
                    </Pressable>
                  )}
                </View>
                ) : null}
              </View>
            ))}

            <View style={styles.campaignCard}>
              <View style={styles.campaignHead}>
                <Text style={styles.sectionTitle}>Kampanya ve puan</Text>
              </View>
              {campaignChipOptions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.campaignChipsRow}
              >
                {campaignChipOptions.map((c) => {
                  const active = c.key === campaignKey;
                  return (
                    <Pressable
                      key={c.key}
                      style={[styles.campaignChip, active && styles.campaignChipActive]}
                      onPress={() => setCampaignKey(c.key)}
                      disabled={submitting}
                    >
                      <Text style={[styles.campaignChipText, active && styles.campaignChipTextActive]}>
                        {c.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              ) : null}
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Kupon kodu"
                  placeholderTextColor={menuColors.textMutedLight}
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                />
                <Pressable
                  style={({ pressed }) => [styles.couponBtn, pressScale(pressed)]}
                  onPress={applyCoupon}
                >
                  <LinearGradient
                    colors={['#9AE6A8', '#6BCF76', '#3FA34D']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.couponBtnGradient}
                  >
                    <Text style={styles.couponBtnText}>Uygula</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              {couponApplied ? (
                <Text style={styles.couponApplied}>Uygulanan kupon: {couponApplied}</Text>
              ) : null}
              <View style={styles.pointsHead}>
                <View>
                  <Text style={styles.sectionTitle}>Kullanilabilir Para Puan</Text>
                  <Text style={styles.sectionSub}>
                    {formatPrice(redeemablePointsValue)} • Maks indirim: {formatPrice(maxPointDiscount)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setUsePoints((v) => !v)}
                  style={[styles.toggleBtn, usePoints && styles.toggleBtnActive]}
                >
                  <View style={[styles.toggleKnob, usePoints && styles.toggleKnobActive]} />
                </Pressable>
              </View>
              {usePoints ? (
                <View style={styles.pointsPreview}>
                  <Text style={styles.pointsPreviewLabel}>Uygulanacak puan indirimi</Text>
                  <Text style={styles.pointsPreviewValue}>-{formatPrice(pointsDiscount)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.checkoutCard}>
              <Pressable
                style={styles.checkoutSummaryHead}
                onPress={() => setSummaryExpanded((v) => !v)}
                disabled={submitting}
              >
                <View style={styles.checkoutSummaryHeadLeft}>
                  <Text style={styles.sectionTitle}>Ödeme özeti</Text>
                  {!summaryExpanded ? (
                    <Text style={styles.checkoutSummaryHint}>Detaylar için dokun</Text>
                  ) : null}
                </View>
                <View style={styles.checkoutSummaryHeadRight}>
                  <Text style={styles.summaryPayValueCompact}>{formatPrice(payableTotal)}</Text>
                  <Ionicons
                    name={summaryExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#6B7280"
                  />
                </View>
              </Pressable>

              {summaryExpanded ? (
                <View style={styles.summaryDetails}>
                  <View style={styles.summaryRowCompact}>
                    <Text style={styles.summaryLabel}>Ara toplam</Text>
                    <Text style={styles.summaryValue}>{formatPrice(totals.sum)}</Text>
                  </View>
                  {totalDiscount > 0 ? (
                    <View style={styles.summaryRowCompact}>
                      <Text style={styles.summaryLabel}>İndirim</Text>
                      <Text style={styles.summaryDiscount}>-{formatPrice(totalDiscount)}</Text>
                    </View>
                  ) : null}
                  {pointsDiscount > 0 ? (
                    <View style={styles.summaryRowCompact}>
                      <Text style={styles.summaryLabel}>Para puan</Text>
                      <Text style={styles.summaryDiscount}>-{formatPrice(pointsDiscount)}</Text>
                    </View>
                  ) : null}
                  {serviceFee > 0 ? (
                    <View style={styles.summaryRowCompact}>
                      <Text style={styles.summaryLabel}>Servis ücreti</Text>
                      <Text style={styles.summaryValue}>{formatPrice(serviceFee)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRowCompact}>
                    <Text style={styles.summaryPayLabel}>Toplam</Text>
                    <Text style={styles.summaryPayValue}>{formatPrice(payableTotal)}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.checkoutDivider} />
              <Text style={styles.checkoutSectionLabel}>Ödeme yöntemi</Text>
              <View style={styles.paymentMethodsRow}>
                <Pressable
                  style={[styles.paymentOption, paymentMethod === 'table' && styles.paymentOptionActive]}
                  onPress={() => selectPaymentMethod('table')}
                  disabled={submitting}
                >
                  <Ionicons name="restaurant-outline" size={14} color="#4B5563" />
                  <Text style={styles.paymentOptionText}>Masada</Text>
                </Pressable>
                <Pressable
                  style={[styles.paymentOption, paymentMethod === 'cashier' && styles.paymentOptionActive]}
                  onPress={() => selectPaymentMethod('cashier')}
                  disabled={submitting}
                >
                  <Ionicons name="receipt-outline" size={14} color="#4B5563" />
                  <Text style={styles.paymentOptionText}>Kasada</Text>
                </Pressable>
                <Pressable
                  style={[styles.paymentOption, paymentMethod === 'online' && styles.paymentOptionActive]}
                  onPress={() => selectPaymentMethod('online')}
                  disabled={submitting}
                >
                  <Ionicons name="card-outline" size={14} color="#4B5563" />
                  <Text style={styles.paymentOptionText}>Online</Text>
                </Pressable>
              </View>
              {isOnlinePayment && cardFormReady && !showCardSheet ? (
                <Pressable
                  style={styles.cardSavedRow}
                  onPress={() => setShowCardSheet(true)}
                  disabled={submitting}
                >
                  <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                  <Text style={styles.cardSavedText} numberOfLines={1}>
                    Kart ••••{digitsOnly(cardNumber, 16).slice(-4)} — düzenle
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {checkoutError ? <Text style={styles.errorTextInline}>{checkoutError}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.checkoutBtn,
                (!tableNumber || submitting) && styles.checkoutBtnDisabled,
                pressScale(pressed),
              ]}
              onPress={handleCheckout}
              disabled={!tableNumber || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={menuColors.white} />
              ) : (
                <LinearGradient
                  colors={['#7FD67F', '#52C060', '#3FA34D']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.checkoutGradient}
                >
                  <Ionicons name="bag-handle-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.checkoutBtnText}>
                    {!tableNumber
                      ? 'QR okut'
                      : isOnlinePayment
                        ? `${formatPrice(payableTotal)} • Öde ve tamamla`
                        : `${formatPrice(payableTotal)} • Siparişi tamamla`}
                  </Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>

      <Modal
        visible={showCardSheet}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={closeCardSheet}
      >
        <KeyboardAvoidingView
          style={styles.cardSheetBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.cardSheetDismissArea} onPress={closeCardSheet} />
          <View style={[styles.cardSheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.cardSheetHandleWrap}>
              <View style={styles.cardSheetHandle} />
            </View>
            <View style={styles.cardSheetTitleRow}>
              <Text style={styles.cardSheetTitle}>Kart Bilgileri</Text>
              <Pressable style={styles.cardSheetClose} onPress={closeCardSheet} hitSlop={10}>
                <Ionicons name="close" size={22} color={menuColors.primary} />
              </Pressable>
            </View>

            <PaymentCardPreview
              holder={cardHolder}
              number={cardNumber}
              expiry={cardExpiry}
              cvv={cardCvv}
              onChangeHolder={setCardHolder}
              onChangeNumber={(v) => setCardNumber(formatCardNumber(v))}
              onChangeExpiry={(v) => setCardExpiry(formatCardExpiry(v))}
              onChangeCvv={(v) => setCardCvv(digitsOnly(v, 4))}
              editable={!submitting}
            />

            <Pressable
              style={({ pressed }) => [
                styles.cardSheetConfirmBtn,
                pressed && styles.cardSheetConfirmBtnPressed,
              ]}
              onPress={confirmCardSheet}
              disabled={submitting}
            >
              <LinearGradient
                colors={['#4FB458', '#43A047']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.cardSheetConfirmGradient}
              >
                <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                <Text style={styles.cardSheetConfirmText}>Kartı Onayla</Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.sslRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={menuColors.primary} />
              <Text style={styles.sslText}>256-bit SSL ile güvenli ödeme</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={checkoutSuccess !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={finishCheckoutSuccess}
      >
        <View style={styles.successOverlay} accessibilityViewIsModal>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap} accessibilityRole="image">
              <Ionicons name="checkmark" size={36} color="#111827" />
            </View>
            <Text style={styles.successTitle}>Sipariş mutfağa iletildi</Text>
            <Text style={styles.successSubtitle}>
              {checkoutSuccess?.paymentMethod === 'online'
                ? 'Online ödemeniz (demo) alındı. Siparişiniz hazırlanıyor.'
                : checkoutSuccess?.paymentMethod === 'cashier'
                  ? 'Siparişiniz alındı. Ödemeyi kasada yapabilirsiniz.'
                  : 'Siparişiniz alındı. Ödemeyi masada yapabilirsiniz.'}
            </Text>
            <View style={styles.successMeta}>
              <View style={styles.successMetaRow}>
                <Text style={styles.successMetaLabel}>Masa</Text>
                <Text style={styles.successMetaValue}>{checkoutSuccess?.tableNumber}</Text>
              </View>
              <View style={styles.successMetaDivider} />
              <View style={styles.successMetaRow}>
                <Text style={styles.successMetaLabel}>Sipariş no</Text>
                <Text style={styles.successMetaValueMono}>…{checkoutSuccess?.shortId}</Text>
              </View>
              {checkoutSuccess?.status ? (
                <>
                  <View style={styles.successMetaDivider} />
                  <View style={styles.successMetaRow}>
                    <Text style={styles.successMetaLabel}>Durum</Text>
                    <Text style={styles.successMetaValue}>
                      {orderStatusLabel(checkoutSuccess.status)}
                    </Text>
                  </View>
                </>
              ) : null}
              {checkoutSuccess?.branchLabel ? (
                <>
                  <View style={styles.successMetaDivider} />
                  <View style={styles.successMetaRow}>
                    <Text style={styles.successMetaLabel}>İşletme</Text>
                    <Text style={styles.successMetaValue} numberOfLines={2}>
                      {checkoutSuccess.branchLabel}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
            <Pressable
              onPress={finishCheckoutSuccess}
              style={({ pressed }) => [styles.successPrimaryWrap, pressScale(pressed)]}
              accessibilityRole="button"
              accessibilityLabel="Menüye dön"
            >
              <LinearGradient
                colors={['#7FD67F', '#52C060', '#3FA34D']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.successPrimaryGradient}
              >
                <Text style={styles.successPrimaryText}>Menüye dön</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AppAlert
        visible={appAlert !== null}
        variant={appAlert?.variant}
        title={appAlert?.title ?? ''}
        message={appAlert?.message}
        buttons={appAlert?.buttons}
        onRequestClose={closeAppAlert}
        onDismiss={() => appAlert?.onCancel?.()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerLogoFrame: {
    width: 146,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#CFCFCF',
  },
  headerLogo: {
    width: 146,
    height: 34,
    opacity: 0.98,
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: menuColors.card,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 10,
  },
  emptyTrayImage: {
    width: 120,
    height: 120,
    marginBottom: 4,
    opacity: 0.85,
  },
  emptyTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: menuColors.text,
  },
  emptySub: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: menuColors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.white,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 120,
    gap: 5,
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: menuColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  branchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  branchIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF5EF',
    borderWidth: 1,
    borderColor: '#E2ECE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  branchIconImage: {
    width: 24,
    height: 24,
    borderRadius: 0,
  },
  branchTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  branchName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: '#111827',
  },
  branchTable: {
    marginTop: 1,
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: '#4B5563',
  },
  activePill: {
    backgroundColor: '#D9F1DC',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginLeft: 10,
  },
  activePillText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#166534',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  infoText: {
    flex: 1,
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: '#6B7280',
  },
  lineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  lineUpper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 26,
  },
  lineBottomSpacer: {
    flex: 1,
    minWidth: 8,
  },
  lineImage: {
    width: 72,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  lineInfo: {
    flex: 1,
    minWidth: 0,
    paddingTop: 0,
    justifyContent: 'center',
  },
  lineName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#111827',
    lineHeight: 16,
  },
  lineDesc: {
    marginTop: 1,
    fontFamily: homeFonts.sans,
    fontSize: 10,
    color: '#757575',
    lineHeight: 12,
  },
  linePrice: {
    marginTop: 2,
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#2E7D32',
  },
  qtyPill: {
    flexShrink: 0,
    minWidth: 88,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: QTY_WARM_GREEN,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  qtyBtnGhost: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#111827',
    minWidth: 18,
    textAlign: 'center',
  },
  noteRowBtn: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 8,
  },
  noteRowBtnPressed: {
    opacity: 0.85,
    backgroundColor: 'rgba(63, 163, 77, 0.08)',
  },
  noteRowBtnText: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: '#757575',
    flexShrink: 1,
  },
  noteRowBtnTextActive: {
    color: menuColors.primaryDark,
  },
  lineNoteSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
  },
  lineNoteCollapsed: {
    paddingVertical: 4,
  },
  lineNotePreview: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.text,
    lineHeight: 16,
  },
  lineNoteEditHint: {
    marginTop: 4,
    fontFamily: homeFonts.sans,
    fontSize: 10,
    color: menuColors.textMutedLight,
  },
  lineNoteInput: {
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: menuColors.primary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.text,
    textAlignVertical: 'top',
  },
  campaignCard: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    padding: 12,
  },
  campaignHead: {
    marginBottom: 8,
  },
  campaignChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    flexWrap: 'nowrap',
  },
  campaignChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  campaignChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: menuColors.primary,
  },
  campaignChipText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: '#4B5563',
  },
  campaignChipTextActive: {
    color: menuColors.primaryDark,
  },
  sectionTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.text,
  },
  sectionSub: {
    marginTop: 3,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    fontWeight: '400',
    color: menuColors.textMuted,
    lineHeight: 16,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  couponInput: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: menuColors.border,
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 12,
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.text,
  },
  couponBtn: {
    overflow: 'hidden',
    borderRadius: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  couponBtnGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 12,
    color: '#FFFFFF',
  },
  couponApplied: {
    marginBottom: 8,
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: '#0F766E',
  },
  pointsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pointsPreview: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: menuColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsPreviewLabel: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  pointsPreviewValue: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#0F766E',
  },
  toggleBtn: {
    width: 40,
    height: 22,
    borderRadius: 10,
    backgroundColor: '#E8EAED',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  toggleBtnActive: {
    backgroundColor: menuColors.primary,
    borderColor: 'rgba(46, 125, 50, 0.35)',
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 16 }],
  },
  checkoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    padding: 12,
    marginBottom: 4,
  },
  checkoutSummaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  checkoutSummaryHeadLeft: {
    flex: 1,
    minWidth: 0,
  },
  checkoutSummaryHeadRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkoutSummaryHint: {
    marginTop: 2,
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: menuColors.textMuted,
  },
  summaryPayValueCompact: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: '#111827',
  },
  summaryDetails: {
    marginTop: 6,
  },
  summaryRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  checkoutDivider: {
    height: 1,
    backgroundColor: menuColors.border,
    marginVertical: 10,
  },
  checkoutSectionLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: menuColors.textMuted,
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryLabel: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.textSecondary,
  },
  summaryValue: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.text,
  },
  summaryDiscount: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#0F766E',
  },
  summaryDivider: {
    marginTop: 6,
    marginBottom: 2,
    height: 1,
    backgroundColor: menuColors.border,
  },
  summaryPayLabel: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
  summaryPayValue: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 20,
    color: '#111827',
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  paymentOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: menuColors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
  },
  paymentOptionActive: {
    borderColor: menuColors.primary,
    backgroundColor: '#E8F5E9',
  },
  paymentOptionText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 10,
    color: '#1F2937',
    textAlign: 'center',
  },
  cardSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  cardSavedText: {
    flex: 1,
    fontFamily: homeFonts.sansMedium,
    fontSize: 11,
    color: '#2E7D32',
  },
  cardSheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
  },
  cardSheetDismissArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 18,
    paddingTop: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 22,
  },
  cardSheetHandleWrap: {
    alignItems: 'center',
    marginBottom: 6,
  },
  cardSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  cardSheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 32,
    marginBottom: 12,
    position: 'relative',
  },
  cardSheetTitle: {
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    fontWeight: '700',
    fontSize: 15,
    color: menuColors.primaryDark,
    letterSpacing: 0.2,
  },
  cardSheetClose: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSheetConfirmBtn: {
    marginTop: 14,
    borderRadius: 28,
    overflow: 'hidden',
    width: '100%',
  },
  cardSheetConfirmBtnPressed: {
    opacity: 0.92,
  },
  cardSheetConfirmGradient: {
    minHeight: 54,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardSheetConfirmText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sslRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  sslText: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textMuted,
  },
  errorTextInline: {
    marginBottom: 4,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: '#B42318',
  },
  footer: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0,
  },
  checkoutBtn: {
    backgroundColor: 'transparent',
    minHeight: 52,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkoutBtnDisabled: {
    opacity: 0.55,
  },
  checkoutBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#FFFFFF',
  },
  checkoutGradient: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  successCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    ...uiShadow.lift,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: homeFonts.sansBold,
    fontSize: 20,
    color: menuColors.textBold,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  successSubtitle: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  successMeta: {
    backgroundColor: menuColors.bgSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: menuColors.border,
    paddingVertical: 4,
    marginBottom: 18,
  },
  successMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  successMetaDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    marginHorizontal: 14,
  },
  successMetaLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: '#111827',
    flexShrink: 0,
    marginRight: 8,
  },
  successMetaValue: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#111827',
    textAlign: 'right',
  },
  successMetaValueMono: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#111827',
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  successPrimaryWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  successPrimaryGradient: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successPrimaryText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
