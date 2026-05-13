import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import ProfileSubLayout from '../components/ProfileSubLayout';
import { menuColors, homeFonts, pressScale, uiShadow } from '../constants/homeTheme';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/apiErrorMessage';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/authValidation';

export default function ChangePasswordScreen({ navigation }) {
  const route = useRoute();
  const force = route.params?.forcePasswordUpgrade === true;
  const { changePassword, refreshUser, logout } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!current.trim() || !next.trim()) {
      Alert.alert('Eksik bilgi', 'Mevcut ve yeni şifreyi girin.');
      return;
    }
    if (!isStrongPassword(next)) {
      Alert.alert('Şifre kuralı', PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (next !== again) {
      Alert.alert('Şifre', 'Yeni şifre tekrarı eşleşmiyor.');
      return;
    }
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      await refreshUser();
      if (force) {
        Alert.alert('Tamam', 'Şifreniz güncellendi. Uygulamayı kullanmaya devam edebilirsiniz.');
      } else {
        Alert.alert('Tamam', 'Şifreniz güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      Alert.alert('Hata', apiErrorMessage(e, 'Şifre güncellenemedi'));
    } finally {
      setBusy(false);
    }
  }

  const logoutSlot = force ? (
    <Pressable
      style={({ pressed }) => [styles.topIconBtn, pressScale(pressed)]}
      onPress={() => void logout()}
      hitSlop={10}
    >
      <Text style={styles.logoutTop}>Çıkış</Text>
    </Pressable>
  ) : null;

  return (
    <ProfileSubLayout
      navigation={navigation}
      title={force ? 'Şifre güncelle' : 'Şifre değiştir'}
      showBack={!force}
      rightSlot={logoutSlot}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F3F6F4' }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, uiShadow.card]}>
          {force ? (
            <Text style={styles.forceIntro}>
              Hesabınızın güvenliği için şifreniz yeni kurallara uygun olmalı. Mevcut şifrenizi ve yeni güçlü
              şifrenizi girin.
            </Text>
          ) : null}
          <Text style={styles.hint}>{PASSWORD_POLICY_MESSAGE}</Text>

          <Text style={styles.label}>Mevcut şifre</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            value={current}
            onChangeText={setCurrent}
            placeholder="••••••••"
            placeholderTextColor={menuColors.textMutedLight}
          />
          <Text style={styles.label}>Yeni şifre</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            value={next}
            onChangeText={setNext}
            placeholder="En az 8 karakter + sembol"
            placeholderTextColor={menuColors.textMutedLight}
          />
          <Text style={styles.label}>Yeni şifre (tekrar)</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            value={again}
            onChangeText={setAgain}
            placeholder="Tekrar"
            placeholderTextColor={menuColors.textMutedLight}
          />
          <Pressable
            style={({ pressed }) => [
              styles.submit,
              (busy || pressed) && { opacity: busy ? 0.65 : 0.92 },
              pressScale(pressed),
            ]}
            onPress={() => void submit()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={menuColors.white} />
            ) : (
              <Text style={styles.submitText}>Güncelle</Text>
            )}
          </Pressable>
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
  card: {
    backgroundColor: menuColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: menuColors.border,
    padding: 16,
  },
  forceIntro: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: menuColors.text,
    lineHeight: 21,
    marginBottom: 10,
  },
  hint: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: menuColors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  label: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: menuColors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    fontFamily: homeFonts.sans,
    fontSize: 16,
    color: menuColors.text,
    borderWidth: 1,
    borderColor: menuColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: menuColors.bg,
    marginBottom: 4,
  },
  submit: {
    marginTop: 18,
    backgroundColor: menuColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: menuColors.white,
  },
  topIconBtn: {
    minWidth: 56,
    paddingHorizontal: 8,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: menuColors.card,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  logoutTop: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.textSecondary,
  },
});
