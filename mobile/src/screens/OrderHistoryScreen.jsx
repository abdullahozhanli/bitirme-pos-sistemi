import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
import client from '../api/client';
import { apiErrorMessage } from '../utils/apiErrorMessage';
import { useCart } from '../context/CartContext';

const PAGE_BG = '#F3F6F4';

function formatPrice(value) {
  return `₺${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function statusLabel(s) {
  const x = String(s || '').toLowerCase();
  const map = {
    hazirlaniyor: 'Hazırlanıyor',
    serviste: 'Serviste',
    tamamlandi: 'Tamamlandı',
    iptal: 'İptal',
    ödendi: 'Ödendi',
    paid: 'Ödendi',
    created: 'Oluşturuldu',
    sent_to_kitchen: 'Mutfağa iletildi',
    in_prep: 'Hazırlanıyor',
    ready: 'Hazır',
    served: 'Servis edildi',
    canceled: 'İptal',
  };
  return map[x] || s || '—';
}

function lineToProduct(line) {
  const mid = line?.menuItem;
  if (mid && typeof mid === 'object' && mid._id) {
    return {
      _id: mid._id,
      name: line.name || mid.name || 'Ürün',
      price: Number(line.price ?? mid.price ?? 0),
      imageUrl: mid.imageUrl || '',
    };
  }
  return null;
}

export default function OrderHistoryScreen({ navigation, route }) {
  const reorderMode = Boolean(route?.params?.reorderMode);
  const branchName = String(route?.params?.branchName || '').trim();
  const branchIdParam = route?.params?.branchId;

  useEffect(() => {
    if (branchIdParam === undefined) {
      navigation.replace('BranchList', { intent: reorderMode ? 'reorder' : 'pastOrders' });
    }
  }, [branchIdParam, navigation, reorderMode]);

  const apiBranchId = branchIdParam === undefined ? undefined : String(branchIdParam);

  const title = useMemo(() => {
    const place = branchName || 'Mekan';
    return reorderMode ? `${place} · tekrar` : `${place} · geçmiş`;
  }, [branchName, reorderMode]);

  const { addToCart } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (apiBranchId === undefined) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/api/orders/mine', {
        params: { limit: 80, branchId: apiBranchId },
      });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Siparişler yüklenemedi'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiBranchId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addLineToCart = useCallback(
    (line) => {
      const p = lineToProduct(line);
      if (!p || !p._id) {
        Alert.alert('Ürün eklenemedi', 'Bu kalem artık menüde olmayabilir.');
        return;
      }
      addToCart(p, { unitPrice: p.price, qty: Number(line.qty) || 1, note: line.note || '' });
    },
    [addToCart]
  );

  const addWholeOrder = useCallback(
    (order) => {
      const lines = Array.isArray(order.items) ? order.items : [];
      let n = 0;
      for (const line of lines) {
        const p = lineToProduct(line);
        if (p?._id) {
          addToCart(p, {
            unitPrice: p.price,
            qty: Number(line.qty) || 1,
            note: line.note || '',
          });
          n += 1;
        }
      }
      if (n === 0) {
        Alert.alert('Sepet', 'Bu siparişte eklenebilir ürün bulunamadı.');
        return;
      }
      Alert.alert('Sepet', `${n} kalem sepete eklendi.`, [
        { text: 'Menüde kal', style: 'cancel' },
        { text: 'Sepete git', onPress: () => navigation.navigate('Cart') },
      ]);
    },
    [addToCart, navigation]
  );

  function renderOrder({ item: order }) {
    const lines = Array.isArray(order.items) ? order.items : [];
    const tableName = order.table?.name || order.tableNumber || '—';
    return (
      <View style={[styles.card, uiShadow.card]}>
        <View style={styles.cardHead}>
          <View>
            <Text style={styles.cardDate}>{formatDate(order.createdAt)}</Text>
            <Text style={styles.cardMeta}>
              Masa {tableName} · {statusLabel(order.status)}
            </Text>
          </View>
          <Text style={styles.cardTotal}>{formatPrice(order.total)}</Text>
        </View>
        {lines.map((line, idx) => (
          <View key={`${order._id}-l-${idx}`} style={styles.lineRow}>
            <Text style={styles.lineQty}>{Number(line.qty) || 1}×</Text>
            <Text style={styles.lineName} numberOfLines={2}>
              {line.name || 'Ürün'}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.lineBtn, pressScale(pressed)]}
              onPress={() => addLineToCart(line)}
            >
              <Text style={styles.lineBtnText}>Ekle</Text>
            </Pressable>
          </View>
        ))}
        {reorderMode ? (
          <Pressable
            style={({ pressed }) => [styles.repeatBtn, pressScale(pressed)]}
            onPress={() => addWholeOrder(order)}
          >
            <Ionicons name="cart-outline" size={18} color={menuColors.white} />
            <Text style={styles.repeatBtnText}>Siparişi tekrarla</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <ProfileSubLayout navigation={navigation} title={title}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={menuColors.primary} />
          <Text style={styles.hint}>Yükleniyor…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={menuColors.textMutedLight} />
          <Text style={styles.err}>{error}</Text>
          <Pressable style={({ pressed }) => [styles.retry, pressScale(pressed)]} onPress={load}>
            <Text style={styles.retryText}>Yenile</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => String(o._id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={40} color={menuColors.textMutedLight} />
              <Text style={styles.empty}>
                {reorderMode
                  ? 'Bu mekanda tekrarlayabileceğiniz sipariş yok.'
                  : 'Bu mekanda henüz kayıtlı sipariş yok.'}
              </Text>
            </View>
          }
        />
      )}
    </ProfileSubLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    flexGrow: 1,
    backgroundColor: PAGE_BG,
  },
  center: {
    flex: 1,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: PAGE_BG,
  },
  hint: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
  },
  err: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: '#B42318',
    textAlign: 'center',
  },
  empty: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  retry: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: menuColors.primary,
  },
  retryText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.white,
  },
  card: {
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: menuColors.border,
  },
  cardDate: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.text,
  },
  cardMeta: {
    marginTop: 4,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  cardTotal: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.primaryDark,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  lineQty: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: menuColors.textSecondary,
    minWidth: 28,
  },
  lineName: {
    flex: 1,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.text,
  },
  lineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(63,163,77,0.12)',
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  lineBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 12,
    color: menuColors.primaryDark,
  },
  repeatBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: menuColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  repeatBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.white,
  },
});
