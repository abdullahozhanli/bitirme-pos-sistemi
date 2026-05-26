import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { homeFonts, pressScale } from '../../constants/homeTheme';

const PALETTE = {
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  success: '#16A34A',
  tagBg: '#FEF3C7',
  tagText: '#92400E',
};

export default function CampaignCard({ onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressScale(pressed)]}
      onPress={onPress}
    >
      <View style={styles.badgeWrap}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MOBİL UYGULAMAYA ÖZEL</Text>
        </View>
      </View>
      <Text style={styles.title}>İlk siparişe %20 indirim</Text>
      <Text style={styles.desc}>
        QR ile bağlandıktan sonra uygulamaya özel fırsatları keşfedin.
      </Text>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Detayları Gör</Text>
        <Ionicons name="chevron-forward" size={16} color={PALETTE.success} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  badgeWrap: {
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: PALETTE.tagBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 11,
    color: PALETTE.tagText,
  },
  title: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: PALETTE.textPrimary,
    marginBottom: 4,
  },
  desc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: PALETTE.textSecondary,
    marginBottom: 12,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: PALETTE.success,
  },
});
