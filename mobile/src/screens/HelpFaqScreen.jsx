import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';

const FAQ = [
  {
    q: 'Masaya nasıl bağlanırım?',
    a: 'Ana ekrandan QR okutarak şube ve masa bilgisini kaydedin; ardından menüden sipariş verebilirsiniz.',
  },
  {
    q: 'Siparişimi nasıl takip ederim?',
    a: 'Şu an durum bildirimleri geliştirilme aşamasındadır; geçmiş siparişlerinizi profilden görebilirsiniz.',
  },
  {
    q: 'Ödeme nasıl yapılır?',
    a: 'Sepet ekranında ödeme tercihinizi seçip siparişi tamamlayın; işletme kurallarına göre masada veya kasada ödeme alınabilir.',
  },
];

export default function HelpFaqScreen({ navigation }) {
  return (
    <ProfileSubLayout navigation={navigation} title="Yardım ve destek">
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
      >
        {FAQ.map((item) => (
          <View key={item.q} style={[styles.card, uiShadow.card]}>
            <Text style={styles.q}>{item.q}</Text>
            <Text style={styles.a}>{item.a}</Text>
          </View>
        ))}
        <Pressable
          style={({ pressed }) => [styles.linkBtn, pressScale(pressed)]}
          onPress={() => navigation.navigate('Contact')}
        >
          <Text style={styles.linkBtnText}>İletişim bilgileri</Text>
        </Pressable>
      </ScrollView>
    </ProfileSubLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: menuColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 14,
    marginBottom: 12,
  },
  q: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
    marginBottom: 8,
  },
  a: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    lineHeight: 21,
  },
  linkBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: menuColors.primary,
  },
  linkBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.white,
  },
});
