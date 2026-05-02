import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
import { useCart } from '../context/CartContext';
import { useTableSession } from '../context/TableSessionContext';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { apiErrorMessage } from '../utils/apiErrorMessage';

function formatPrice(value) {
  return `₺${Number(value).toFixed(2).replace('.', ',')}`;
}

export default function CartScreen({ navigation }) {
  const { lines, incrementQty, decrementQty, removeLine, clearCart, totals } = useCart();
  const { tableNumber, branchId } = useTableSession();
  const { refreshUser } = useAuth();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

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
        notes: notes.trim(),
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
                  <Text style={styles.lineName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Pressable onPress={() => removeLine(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color="#B91C1C" />
                  </Pressable>
                </View>
                {item.note ? <Text style={styles.lineNote}>{item.note}</Text> : null}
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
              <Text style={styles.footerHint}>{totals.count} urun</Text>
              <Text style={styles.footerTotal}>{formatPrice(totals.sum)}</Text>
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
    gap: 10,
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  lineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  lineName: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
  lineNote: {
    marginTop: 4,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
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
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  footerHint: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  footerTotal: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: menuColors.text,
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
