import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, uiShadow } from '../constants/homeTheme';
import { useAuth } from '../context/AuthContext';
import { getLoyaltyPoints } from '../utils/loyaltyPoints';

const POINT_VALUE_TRY = 0.1;

export default function LoyaltyPointsScreen({ navigation }) {
  const { user } = useAuth();
  const pts = getLoyaltyPoints(user);
  const tryApprox = Number((pts * POINT_VALUE_TRY).toFixed(2));

  return (
    <ProfileSubLayout navigation={navigation} title="Puanlarım">
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
      >
        <View style={[styles.hero, uiShadow.card]}>
          <Text style={styles.heroValue}>{pts}</Text>
          <Text style={styles.heroUnit}>parapuan</Text>
          <Text style={styles.heroHint}>
            Sepette yaklaşık ₺{tryApprox.toFixed(2).replace('.', ',')} değerinde kullanılabilir
            (örnek oran: 1 puan ≈ ₺{POINT_VALUE_TRY.toFixed(1).replace('.', ',')}).
          </Text>
        </View>
        <View style={[styles.card, uiShadow.card]}>
          <Text style={styles.blockTitle}>Nasıl kazanılır?</Text>
          <Text style={styles.p}>
            Giriş yapmış müşteri hesabınızla verdiğiniz siparişlerde tutar üzerinden puan
            kazanırsınız. Puanlarınız ödeme adımında kullanılabilir.
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
  },
  hero: {
    backgroundColor: menuColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroValue: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 40,
    color: menuColors.primaryDark,
  },
  heroUnit: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 15,
    color: menuColors.textSecondary,
    marginTop: 4,
  },
  heroHint: {
    marginTop: 14,
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: menuColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 16,
  },
  blockTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: menuColors.text,
    marginBottom: 8,
  },
  p: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    lineHeight: 21,
  },
});
