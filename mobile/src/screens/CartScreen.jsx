import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { menuColors, homeFonts, pressScale } from '../constants/homeTheme';
import { useCart } from '../context/CartContext';
import { useTableSession } from '../context/TableSessionContext';
import { useAuth } from '../context/AuthContext';
import { getLoyaltyPoints } from '../utils/loyaltyPoints';
import client from '../api/client';
import { apiErrorMessage } from '../utils/apiErrorMessage';

function formatPrice(value) {
  return `₺${Number(value).toFixed(2).replace('.', ',')}`;
}

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=320&q=80';
const POINT_VALUE_TRY = 0.1;
/** Adet kutusu: sıcak yeşil çerçeve + ikonlar */
const QTY_WARM_GREEN = '#7CB342';

export default function CartScreen({ navigation }) {
  const { lines, incrementQty, decrementQty, clearCart, totals, updateLineNoteAt } = useCart();
  const { tableNumber, branchId, branchName } = useTableSession();
  const { refreshUser, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [campaignKey, setCampaignKey] = useState('none');
  const [usePoints, setUsePoints] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState('');
  const [openNoteIndex, setOpenNoteIndex] = useState(-1);
  const [paymentMethod, setPaymentMethod] = useState('table');
  const [checkoutError, setCheckoutError] = useState('');

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  const points = getLoyaltyPoints(user);
  const redeemablePointsValue = Number((points * POINT_VALUE_TRY).toFixed(2));
  const campaignOptions = useMemo(() => {
    const list = [{ key: 'none', title: 'Kampanya kullanma', rate: 0 }];
    if (totals.sum >= 500) {
      list.push({ key: 'ten', title: '%10 sepet indirimi', rate: 0.1 });
    } else if (totals.sum >= 300) {
      list.push({ key: 'seven', title: '%7 sepet indirimi', rate: 0.07 });
    } else if (totals.sum >= 200) {
      list.push({ key: 'five', title: '%5 sepet indirimi', rate: 0.05 });
    }
    return list;
  }, [totals.sum]);

  /** Çiplerde gösterilecekler ('Kampanya kullanma' yok) */
  const campaignChipOptions = useMemo(
    () => campaignOptions.filter((c) => c.key !== 'none'),
    [campaignOptions]
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
      Alert.alert('Kupon', 'Lütfen kupon kodu girin.');
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
      Alert.alert('Kupon geçersiz', 'Bu kupon kodu kullanılamıyor.');
      return;
    }
    const discount = Number((totals.sum * rate).toFixed(2));
    setCouponDiscount(discount);
    setCouponApplied(normalized);
    Alert.alert('Kupon uygulandı', `${normalized} ile -${formatPrice(discount)} indiriminiz var.`);
  }

  async function handleCheckout() {
    if (submitting || lines.length === 0) return;
    setCheckoutError('');

    if (!tableNumber) {
      Alert.alert('Masa gerekli', 'Sipariş vermek için önce QR ile masayı bağlayın.', [
        { text: 'QR Tara', onPress: () => navigation.navigate('QRScanner') },
        { text: 'Tamam', style: 'cancel' },
      ]);
      return;
    }

    setSubmitting(true);
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
          pointsDiscount > 0 ? `Puan kullanimi (on izleme): -${formatPrice(pointsDiscount)}` : '',
          paymentMethod ? `Odeme yontemi: ${paymentMethod}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        branchId: branchPayload,
      };

      const res = await client.post('/api/orders', orderPayload);
      const created = res.data;
      const shortId = String(created?._id || '').slice(-6);
      clearCart();
      setOpenNoteIndex(-1);
      await refreshUser();
      Alert.alert('Siparişin mutfağa iletildi.', `Masa ${tableNumber} • No: …${shortId}`, [
        { text: 'Menüye dön', onPress: () => navigation.navigate('Menu') },
      ]);
    } catch (err) {
      const message = apiErrorMessage(err, 'Sipariş gönderilemedi.');
      setCheckoutError(message);
      Alert.alert('Hata', message);
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
            onPress={() => navigation.navigate('Menu')}
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

            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Odeme Ozeti</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ara Toplam</Text>
                <Text style={styles.summaryValue}>{formatPrice(totals.sum)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Indirim</Text>
                <Text style={styles.summaryDiscount}>-{formatPrice(totalDiscount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Para Puan</Text>
                <Text style={styles.summaryDiscount}>-{formatPrice(pointsDiscount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Servis Ucreti</Text>
                <Text style={styles.summaryValue}>{formatPrice(serviceFee)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryPayLabel}>Toplam</Text>
                <Text style={styles.summaryPayValue}>{formatPrice(payableTotal)}</Text>
              </View>
            </View>

            <View style={styles.paymentCard}>
              <View style={styles.paymentMethodsRow}>
                <Pressable
                  style={[styles.paymentOption, paymentMethod === 'table' && styles.paymentOptionActive]}
                  onPress={() => setPaymentMethod('table')}
                >
                  <Ionicons name="restaurant-outline" size={16} color="#4B5563" />
                  <Text style={styles.paymentOptionText}>Masada odeme</Text>
                  <Ionicons
                    name={paymentMethod === 'table' ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={paymentMethod === 'table' ? '#2E7D32' : '#9CA3AF'}
                  />
                </Pressable>
                <Pressable
                  style={[styles.paymentOption, paymentMethod === 'cashier' && styles.paymentOptionActive]}
                  onPress={() => setPaymentMethod('cashier')}
                >
                  <Ionicons name="receipt-outline" size={16} color="#4B5563" />
                  <Text style={styles.paymentOptionText}>Kasada odeme</Text>
                  <Ionicons
                    name={paymentMethod === 'cashier' ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={paymentMethod === 'cashier' ? '#2E7D32' : '#9CA3AF'}
                  />
                </Pressable>
                <View style={[styles.paymentOption, styles.paymentOptionDisabled]}>
                  <Ionicons name="card-outline" size={16} color="#9CA3AF" />
                  <Text style={styles.paymentOptionTextMuted}>Online odeme</Text>
                  <Text style={styles.comingSoon}>Yakinda</Text>
                </View>
              </View>
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
                      : `${formatPrice(payableTotal)} • Siparisi Tamamla`}
                  </Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    padding: 12,
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
    marginTop: 10,
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
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    padding: 8,
    marginBottom: 4,
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
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  paymentOptionActive: {
    borderColor: menuColors.primary,
    backgroundColor: '#E8F5E9',
  },
  paymentOptionDisabled: {
    backgroundColor: '#F9FAFB',
    borderStyle: 'dashed',
  },
  paymentOptionText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 11,
    color: '#1F2937',
    textAlign: 'center',
  },
  paymentOptionTextMuted: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  comingSoon: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 10,
    color: menuColors.primaryDark,
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
});
