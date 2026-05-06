import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
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

export default function CartScreen({ navigation }) {
  const { lines, incrementQty, decrementQty, clearCart, totals } = useCart();
  const { tableNumber, branchId } = useTableSession();
  const { refreshUser, user } = useAuth();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [campaignKey, setCampaignKey] = useState('none');
  const [usePoints, setUsePoints] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  const points = getLoyaltyPoints(user);
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
      ? Math.min(maxPointDiscount, requestedPointDiscount, Math.max(0, totals.sum - campaignDiscount))
      : 0;
  const payableTotal = Math.max(0, Number((totals.sum - campaignDiscount - pointsDiscount).toFixed(2)));

  async function handleCheckout() {
    if (submitting || lines.length === 0) return;

    if (!tableNumber) {
      Alert.alert('Masa gerekli', 'Siparis vermek icin once QR ile masayi baglayin.', [
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
          note: item.note || '',
        })),
        notes: [
          notes.trim(),
          activeCampaign?.rate ? `Kampanya: ${activeCampaign.title}` : '',
          pointsDiscount > 0 ? `Puan kullanimi (on izleme): -${formatPrice(pointsDiscount)}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        branchId: branchPayload,
      };

      const res = await client.post('/api/orders', orderPayload);
      const created = res.data;
      const shortId = String(created?._id || '').slice(-6);
      clearCart();
      setNotes('');
      await refreshUser();
      Alert.alert(
        'Siparis alindi',
        `Masa ${tableNumber} • No: ...${shortId}`,
        [{ text: 'Tamam', onPress: () => navigation.navigate('Menu') }]
      );
    } catch (err) {
      Alert.alert('Hata', apiErrorMessage(err, 'Siparis gonderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressScale(pressed)]}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={menuColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Sepet</Text>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressScale(pressed)]}
          onPress={() => navigation.navigate('QRScanner')}
          hitSlop={10}
        >
          <Ionicons name="qr-code-outline" size={20} color={menuColors.primaryDark} />
        </Pressable>
      </View>

      {lines.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="cart-outline" size={56} color={menuColors.textMutedLight} />
          <Text style={styles.emptyTitle}>Sepetin bos</Text>
          <Text style={styles.emptySub}>Menuden urun ekleyebilirsin.</Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressScale(pressed)]}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={styles.primaryBtnText}>Menuye don</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F2F6F3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.summaryCard, uiShadow.card]}
            >
              <View style={styles.summaryTop}>
                <Text style={styles.summaryTitle}>Siparis Ozeti</Text>
                <Text style={styles.summaryBadge}>{totals.count} urun</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ara toplam</Text>
                <Text style={styles.summaryValue}>{formatPrice(totals.sum)}</Text>
              </View>
              {campaignDiscount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Kampanya indirimi</Text>
                  <Text style={styles.summaryDiscount}>-{formatPrice(campaignDiscount)}</Text>
                </View>
              ) : null}
              {pointsDiscount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Puan indirimi</Text>
                  <Text style={styles.summaryDiscount}>-{formatPrice(pointsDiscount)}</Text>
                </View>
              ) : null}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryPayLabel}>Odenecek</Text>
                <Text style={styles.summaryPayValue}>{formatPrice(payableTotal)}</Text>
              </View>
            </LinearGradient>

            {tableNumber ? (
              <View style={[styles.tableBanner, uiShadow.card]}>
                <Text style={styles.tableBannerText}>
                  Masa <Text style={styles.tableStrong}>{tableNumber}</Text>
                </Text>
                <Pressable onPress={() => navigation.navigate('QRScanner')}>
                  <Text style={styles.tableChange}>Degistir</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.warnBanner, uiShadow.card]}
                onPress={() => navigation.navigate('QRScanner')}
              >
                <Ionicons name="warning-outline" size={18} color="#B45309" />
                <Text style={styles.warnText}>Masa baglamak icin QR okut</Text>
              </Pressable>
            )}

            {lines.map((item) => (
              <View
                key={`${String(item._id)}-${item.sizeKey || 'd'}-${item.note || ''}`}
                style={[styles.lineCard, uiShadow.card]}
              >
                <View style={styles.lineTop}>
                  <Image
                    source={{ uri: item.imageUrl || FALLBACK_IMG }}
                    style={styles.lineImage}
                    resizeMode="cover"
                  />
                  <View style={styles.lineInfo}>
                    <Text style={styles.lineName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.note ? <Text style={styles.lineNote}>{item.note}</Text> : null}
                    <Text style={styles.unitPrice}>
                      Birim: {formatPrice(Number(item.unitPrice ?? item.price ?? 0))}
                    </Text>
                  </View>
                </View>
                <View style={styles.lineBottom}>
                  <View style={styles.qtyRow}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => decrementQty(item)}
                      disabled={submitting}
                    >
                      <Ionicons name="remove" size={18} color={menuColors.text} />
                    </Pressable>
                    <Text style={styles.qtyVal}>{item.qty}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => incrementQty(item)}
                      disabled={submitting}
                    >
                      <Ionicons name="add" size={18} color={menuColors.text} />
                    </Pressable>
                  </View>
                  <Text style={styles.linePrice}>
                    {formatPrice(item.qty * Number(item.unitPrice ?? item.price ?? 0))}
                  </Text>
                </View>
              </View>
            ))}

            <View style={[styles.campaignCard, uiShadow.card]}>
              <View style={styles.campaignHead}>
                <Text style={styles.sectionTitle}>Kampanya</Text>
                <Text style={styles.sectionSub}>Uygun teklif otomatik listelenir</Text>
              </View>
              <View style={styles.campaignList}>
                {campaignOptions.map((option) => {
                  const active = option.key === campaignKey;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setCampaignKey(option.key)}
                      style={[styles.campaignChip, active && styles.campaignChipActive]}
                    >
                      {active ? <Ionicons name="checkmark-circle" size={13} color={menuColors.primaryDark} /> : null}
                      <Text style={[styles.campaignChipText, active && styles.campaignChipTextActive]}>
                        {option.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.pointsCard, uiShadow.card]}>
              <View style={styles.pointsHead}>
                <View>
                  <Text style={styles.sectionTitle}>Para Puan Kullan</Text>
                  <Text style={styles.sectionSub}>
                    Bakiye: {points} puan • Maks indirim: {formatPrice(maxPointDiscount)}
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

            <Text style={styles.notesLabel}>Siparis notu (opsiyonel)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Orn: Sogansiz, az acili..."
              placeholderTextColor={menuColors.textMutedLight}
              value={notes}
              onChangeText={setNotes}
              multiline
              editable={!submitting}
            />
          </ScrollView>

          <View style={[styles.footer, uiShadow.card]}>
            <View>
              <Text style={styles.footerHint}>Masa {tableNumber || '-'}</Text>
              <Text style={styles.footerPayable}>Odenecek: {formatPrice(payableTotal)}</Text>
            </View>
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
                <Text style={styles.checkoutBtnText}>
                  {!tableNumber ? 'QR okut' : 'Siparisi tamamla'}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 4,
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
  headerTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: menuColors.text,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 10,
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
    gap: 12,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.16)',
    padding: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
  summaryBadge: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 11,
    color: '#185F1D',
    backgroundColor: '#DDF3E0',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    marginTop: 2,
    marginBottom: 8,
    height: 1,
    backgroundColor: menuColors.border,
  },
  summaryPayLabel: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.text,
  },
  summaryPayValue: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: menuColors.primaryDark,
  },
  tableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: menuColors.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  tableBannerText: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.text,
  },
  tableStrong: {
    fontFamily: homeFonts.sansSemi,
    color: menuColors.primaryDark,
  },
  tableChange: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: menuColors.primary,
    textDecorationLine: 'underline',
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.25)',
  },
  warnText: {
    flex: 1,
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: '#92400E',
  },
  lineCard: {
    backgroundColor: menuColors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  lineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: menuColors.bgSoft,
  },
  lineInfo: {
    flex: 1,
    minWidth: 0,
  },
  lineName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
  lineNote: {
    marginTop: 2,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  unitPrice: {
    marginTop: 3,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textMuted,
  },
  lineBottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: menuColors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  qtyVal: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: menuColors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  linePrice: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: menuColors.primaryDark,
  },
  campaignCard: {
    marginTop: 4,
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 12,
  },
  campaignHead: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.text,
  },
  sectionSub: {
    marginTop: 2,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  campaignList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  campaignChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: menuColors.border,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: menuColors.bgSoft,
  },
  campaignChipActive: {
    borderColor: menuColors.primary,
    backgroundColor: '#EAF7EC',
  },
  campaignChipText: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  campaignChipTextActive: {
    fontFamily: homeFonts.sansSemi,
    color: menuColors.primaryDark,
  },
  pointsCard: {
    marginTop: 2,
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 12,
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
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D5D9DD',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleBtnActive: {
    backgroundColor: menuColors.primary,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  notesLabel: {
    marginTop: 6,
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: menuColors.text,
  },
  notesInput: {
    marginTop: 6,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: menuColors.border,
    backgroundColor: menuColors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.text,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: menuColors.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  footerHint: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  footerPayable: {
    marginTop: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: menuColors.primaryDark,
  },
  checkoutBtn: {
    backgroundColor: menuColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 150,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    opacity: 0.55,
  },
  checkoutBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.white,
  },
});
