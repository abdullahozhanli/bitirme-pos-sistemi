import { useCallback, useEffect, useMemo } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
import { useFavorites, normalizeFavoriteBranchId } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=320&q=80';

function formatPrice(value) {
  return `₺${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

export default function FavoritesScreen({ navigation, route }) {
  const branchIdParam = route?.params?.branchId;
  const branchName = String(route?.params?.branchName || '').trim();
  const { favorites, removeFavorite } = useFavorites();
  const { addToCart } = useCart();

  useEffect(() => {
    if (branchIdParam === undefined) {
      navigation.replace('BranchList', { intent: 'favorites' });
    }
  }, [branchIdParam, navigation]);

  const list = useMemo(() => {
    if (branchIdParam === undefined) return [];
    if (branchIdParam === '__none__') {
      return favorites.filter((f) => normalizeFavoriteBranchId(f.branchId) === '');
    }
    return favorites.filter((f) => String(f.branchId || '') === String(branchIdParam));
  }, [favorites, branchIdParam]);

  const title = branchName ? `${branchName} · favoriler` : 'Favoriler';

  const addOne = useCallback(
    (f) => {
      addToCart(
        {
          _id: f._id,
          name: f.name,
          imageUrl: f.imageUrl,
          price: f.price,
        },
        { unitPrice: Number(f.price || 0) }
      );
      Alert.alert('Sepet', 'Ürün sepete eklendi.', [
        { text: 'Tamam', style: 'cancel' },
        { text: 'Sepete git', onPress: () => navigation.navigate('Cart') },
      ]);
    },
    [addToCart, navigation]
  );

  return (
    <ProfileSubLayout navigation={navigation} title={title}>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="heart-outline" size={44} color={menuColors.textMutedLight} />
            <Text style={styles.emptyTitle}>Bu mekanda favori yok</Text>
            <Text style={styles.emptyText}>
              Bu şubede menüden kalp ile eklediğiniz ürünler burada listelenir.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.goMenu, pressScale(pressed)]}
              onPress={() => navigation.navigate('Menu')}
            >
              <Text style={styles.goMenuText}>Menüye git</Text>
            </Pressable>
          </View>
        ) : (
          list.map((f) => {
            const uri = f.imageUrl?.trim() ? f.imageUrl : FALLBACK_IMG;
            const rowKey = `${normalizeFavoriteBranchId(f.branchId)}::${f._id}`;
            return (
              <View key={rowKey} style={[styles.row, uiShadow.card]}>
                <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={2}>
                    {f.name}
                  </Text>
                  <Text style={styles.price}>{formatPrice(f.price)}</Text>
                  <View style={styles.actions}>
                    <Pressable
                      style={({ pressed }) => [styles.btnPrimary, pressScale(pressed)]}
                      onPress={() => addOne(f)}
                    >
                      <Text style={styles.btnPrimaryText}>Sepete ekle</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.btnGhost, pressScale(pressed)]}
                      onPress={() => removeFavorite(f._id, f.branchId)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </ProfileSubLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    marginTop: 14,
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: menuColors.text,
  },
  emptyText: {
    marginTop: 8,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  goMenu: {
    marginTop: 20,
    backgroundColor: menuColors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  goMenuText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.white,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 10,
    marginBottom: 12,
    gap: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: menuColors.pillMuted,
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
  price: {
    marginTop: 4,
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: menuColors.primaryDark,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: menuColors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.white,
  },
  btnGhost: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(185,28,28,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(185,28,28,0.06)',
  },
});
