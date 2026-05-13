import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, uiShadow } from '../constants/homeTheme';

const RULES = [
  { title: '₺200 ve üzeri sepet', desc: '%5 sepet indirimi seçeneği (uygun olduğunda).' },
  { title: '₺300 ve üzeri sepet', desc: '%7 sepet indirimi seçeneği.' },
  { title: '₺500 ve üzeri sepet', desc: '%10 sepet indirimi seçeneği.' },
  { title: 'Parapuan', desc: 'Ödeme adımında puanlarınızdan yararlanabilirsiniz (limitler sepete göre).' },
];

export default function CampaignsScreen({ navigation }) {
  return (
    <ProfileSubLayout navigation={navigation} title="Kampanyalarım">
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.intro}>
          Aşağıdaki kurallar sepet ekranındaki kampanya çipleriyle uyumludur; koşullar sepet
          tutarına göre otomatik değişir.
        </Text>
        {RULES.map((r) => (
          <View key={r.title} style={[styles.card, uiShadow.card]}>
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardDesc}>{r.desc}</Text>
          </View>
        ))}
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
