import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useFavorites, normalizeFavoriteBranchId } from '../context/FavoritesContext';

const PAGE_BG = '#F3F6F4';

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function BranchListScreen({ navigation, route }) {
  const intent = route?.params?.intent || 'pastOrders';
  const title =
    intent === 'reorder'
      ? 'Tekrar sipariş — mekan'
      : intent === 'favorites'
        ? 'Favoriler — mekan'
        : 'Geçmiş siparişler — mekan';

  const { favorites } = useFavorites();
  const [orderBranches, setOrderBranches] = useState([]);
  const [loading, setLoading] = useState(intent !== 'favorites');
  const [error, setError] = useState('');

  const favoriteGroups = useMemo(() => {
    const map = new Map();
    for (const f of favorites) {
      const k = normalizeFavoriteBranchId(f.branchId);
      const prev = map.get(k);
      const nameFromItem = String(f.branchName || '').trim();
      const branchName =
        k === ''
          ? 'Şube atanmamış'
          : nameFromItem ||
            (prev && prev.branchName && prev.branchName !== `Şube (${k.slice(-6)})`
              ? prev.branchName
              : null) ||
            `Şube (${k.slice(-6)})`;
      map.set(k, {
        branchId: k === '' ? '__none__' : k,
        branchName,
        count: (prev?.count || 0) + 1,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.branchName.localeCompare(b.branchName, 'tr', { sensitivity: 'base' })
    );
  }, [favorites]);

  const loadOrderBranches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/api/orders/mine/branches');
      setOrderBranches(Array.isArray(res.data?.branches) ? res.data.branches : []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Mekanlar yüklenemedi'));
      setOrderBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (intent === 'favorites') {
        setLoading(false);
        setError('');
        return;
      }
      loadOrderBranches();
    }, [intent, loadOrderBranches])
  );

  const data = intent === 'favorites' ? favoriteGroups : orderBranches;

  const onPick = useCallback(
    (row) => {
      const bid =
        row.branchId === null || row.branchId === undefined || row.branchId === ''
          ? '__none__'
          : String(row.branchId);
      const bname = row.branchName || 'Mekan';

      if (intent === 'favorites') {
        navigation.navigate('Favorites', { branchId: bid, branchName: bname });
        return;
      }
      if (intent === 'reorder') {
        navigation.navigate('OrderHistory', {
          branchId: bid,
          branchName: bname,
          reorderMode: true,
        });
        return;
      }
      navigation.navigate('OrderHistory', {
        branchId: bid,
        branchName: bname,
        reorderMode: false,
      });
    },
    [intent, navigation]
  );

  function renderRow({ item }) {
    const sub =
      intent === 'favorites'
        ? `${item.count} ürün`
        : `${item.orderCount} sipariş${item.lastOrderAt ? ` · ${formatDate(item.lastOrderAt)}` : ''}`;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, uiShadow.card, pressScale(pressed)]}
        onPress={() => onPick(item)}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="storefront-outline" size={22} color={menuColors.primaryDark} />
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {item.branchName}
          </Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={menuColors.textMutedLight} />
      </Pressable>
    );
  }

  const emptyHint =
    intent === 'favorites'
      ? 'Henüz favori ürün yok. Menüde kalp ile ekleyin; hangi şubedeyseniz o şube için kaydedilir.'
      : 'Bu hesapta henüz sipariş yok veya siparişlerde şube bilgisi yok. QR ile şubeye bağlanıp sipariş verin.';

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
          <Pressable style={({ pressed }) => [styles.retry, pressScale(pressed)]} onPress={loadOrderBranches}>
            <Text style={styles.retryText}>Yenile</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => `${item.branchId || 'x'}-${index}`}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="location-outline" size={40} color={menuColors.textMutedLight} />
              <Text style={styles.empty}>{emptyHint}</Text>
            </View>
          }
        />
      )}
    </ProfileSubLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    flexGrow: 1,
    backgroundColor: PAGE_BG,
  },
  center: {
    flex: 1,
    paddingVertical: 48,
    paddingHorizontal: 22,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(63,163,77,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: menuColors.text,
  },
  sub: {
    marginTop: 4,
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.textSecondary,
  },
});
