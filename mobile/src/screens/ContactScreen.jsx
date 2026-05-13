import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';

const SUPPORT_EMAIL = 'destek@selfkasa.app';

export default function ContactScreen({ navigation }) {
  function mail() {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('SelfKasa destek')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('E-posta', 'E-posta uygulaması açılamadı.');
    });
  }

  return (
    <ProfileSubLayout navigation={navigation} title="İletişim">
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.intro}>
          Sorularınız için bize yazabilirsiniz. E-posta adresi demo amaçlıdır; kendi destek
          adresinizle değiştirmek için projede `ContactScreen.jsx` dosyasını güncelleyin.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.card, uiShadow.card, pressScale(pressed)]}
          onPress={mail}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="mail-outline" size={22} color={menuColors.primaryDark} />
          </View>
          <View style={styles.body}>
            <Text style={styles.label}>E-posta</Text>
            <Text style={styles.value}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={menuColors.textMutedLight} />
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
  intro: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    lineHeight: 21,
    marginBottom: 14,
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
  label: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: menuColors.textSecondary,
  },
  value: {
    marginTop: 2,
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
});
