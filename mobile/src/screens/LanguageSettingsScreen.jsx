import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';

const STORAGE_KEY = 'selfkasa_app_lang_v1';

const OPTIONS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
];

export default function LanguageSettingsScreen({ navigation }) {
  const [lang, setLang] = useState('tr');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (cancelled || !raw) return;
          if (OPTIONS.some((o) => o.code === raw)) setLang(raw);
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function select(code) {
    setLang(code);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, code);
      Alert.alert(
        'Dil',
        code === 'tr'
          ? 'Tercih kaydedildi. Tam uygulama çevirisi sonraki sürümlerde genişletilecek.'
          : 'Preference saved. Full in-app translation will roll out in a future update.'
      );
    } catch {
      Alert.alert('Kayıt', 'Dil tercihi kaydedilemedi.');
    }
  }

  return (
    <ProfileSubLayout navigation={navigation} title="Dil">
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.intro}>
          Şimdilik tercih cihazda saklanır; arayüz metinleri ağırlıklı olarak Türkçe kalır.
        </Text>
        <View style={[styles.card, uiShadow.card]}>
          {OPTIONS.map((opt, index) => {
            const active = lang === opt.code;
            const last = index === OPTIONS.length - 1;
            return (
              <Pressable
                key={opt.code}
                style={({ pressed }) => [
                  styles.option,
                  last && styles.optionLast,
                  pressScale(pressed),
                ]}
                onPress={() => void select(opt.code)}
              >
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color={menuColors.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color={menuColors.border} />
                )}
              </Pressable>
            );
          })}
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
  intro: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    lineHeight: 21,
    marginBottom: 14,
  },
  card: {
    backgroundColor: menuColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: menuColors.border,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: menuColors.border,
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 16,
    color: menuColors.text,
  },
  optionLabelActive: {
    fontFamily: homeFonts.sansSemi,
    color: menuColors.primaryDark,
  },
});
