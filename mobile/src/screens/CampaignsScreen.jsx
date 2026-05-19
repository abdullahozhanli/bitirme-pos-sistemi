import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, uiShadow } from '../constants/homeTheme';
import { useTableSession } from '../context/TableSessionContext';
import client from '../api/client';

export default function CampaignsScreen({ navigation }) {
  const { branchId } = useTableSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!branchId) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await client.get('/api/campaigns', {
          params: { branchId: String(branchId) },
        });
        if (!cancelled) {
          setItems(Array.isArray(res.data?.items) ? res.data.items : []);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return (
    <ProfileSubLayout navigation={navigation} title="Kampanyalarım">
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.intro}>
          İşletmenin tanımladığı kampanyalar sepet ekranında görünür. Minimum sepet tutarına
          ulaştığınızda ilgili kampanyayı seçebilirsiniz.
        </Text>
        {loading ? (
          <ActivityIndicator color={menuColors.primary} style={{ marginTop: 24 }} />
        ) : null}
        {!loading && items.length === 0 ? (
          <Text style={styles.empty}>Bu şube için aktif kampanya bulunmuyor.</Text>
        ) : null}
        {items.map((c) => {
          const isMenu = c.campaignType === 'menu';
          const productNames = (c.products || []).map((p) => p.name).filter(Boolean);
          const desc = isMenu
            ? `${productNames.join(', ') || 'Menü paketi'} · Paket ₺${Number(c.bundlePrice || 0).toFixed(0)}`
            : `₺${Number(c.minCartTotal || 0).toFixed(0)} ve üzeri sepete %${Math.round(
                Number(c.discountRate || 0) * 100
              )} indirim`;
          return (
            <View key={String(c._id)} style={[styles.card, uiShadow.card]}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardDesc}>{desc}</Text>
            </View>
          );
        })}
        <View style={[styles.card, uiShadow.card]}>
          <Text style={styles.cardTitle}>Parapuan</Text>
          <Text style={styles.cardDesc}>
            Ödeme adımında puanlarınızdan yararlanabilirsiniz (limitler sepete göre).
          </Text>
        </View>
      </ScrollView>
    </ProfileSubLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    gap: 10,
  },
  intro: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    lineHeight: 21,
    marginBottom: 8,
  },
  empty: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textMuted,
    marginTop: 8,
  },
  card: {
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 14,
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.textSecondary,
    lineHeight: 19,
  },
});
