import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { menuColors } from '../constants/homeTheme';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/apiErrorMessage';

const colors = {
  background: menuColors.bg,
  primary: menuColors.primary,
  text: menuColors.text,
  textMuted: menuColors.textMuted,
  inputBorder: menuColors.border,
  inputBg: menuColors.card,
  white: menuColors.white,
};
const BUTTON_GRADIENT = ['#3FA34D', '#66BB6A'];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setError('');
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password });
    } catch (e) {
      setError(apiErrorMessage(e, 'Kayıt başarısız'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.backRow}
            onPress={() => navigation.goBack()}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={styles.backText}>Girişe dön</Text>
          </Pressable>

          <Text style={styles.title}>Kayıt Ol</Text>
          <Text style={styles.subtitle}>
            Kampanyalardan yararlanmak için hesap oluştur
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.field}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.textMuted}
              style={styles.fieldIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad (isteğe bağlı)"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={colors.textMuted}
              style={styles.fieldIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-posta adresin"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.textMuted}
              style={styles.fieldIcon}
            />
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Şifre (min. 6 karakter)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={secure}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setSecure((s) => !s)} hitSlop={12}>
              <Ionicons
                name={secure ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <LinearGradient
              colors={BUTTON_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primaryBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Kayıt Ol</Text>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    marginBottom: 12,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    minHeight: 52,
  },
  fieldIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  inputFlex: { flex: 1 },
  primaryBtn: {
    borderRadius: 26,
    minHeight: 52,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryBtnGradient: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
});
