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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { menuColors } from '../constants/homeTheme';
import { useAuth, showComingSoon } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/apiErrorMessage';

const colors = {
  background: menuColors.bg,
  primary: menuColors.primary,
  text: menuColors.text,
  textMuted: menuColors.textMuted,
  inputBorder: menuColors.border,
  inputBg: menuColors.card,
  white: menuColors.white,
  black: '#111111',
  divider: menuColors.border,
  googleBorder: menuColors.border,
};
const BUTTON_GRADIENT = ['#3FA34D', '#66BB6A'];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(apiErrorMessage(e, 'Giriş başarısız'));
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
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <Ionicons name="cafe" size={36} color={colors.white} />
            </View>
          </View>

          <Text style={styles.title}>Hoş Geldin</Text>
          <Text style={styles.subtitle}>
            Favori restoranlarını keşfetmek için giriş yap
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
              placeholder="Şifre"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={secure}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              onPress={() => setSecure((s) => !s)}
              hitSlop={12}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={secure ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <Pressable
            style={styles.forgotWrap}
            onPress={() => showComingSoon('Şifremi unuttum')}
          >
            <Text style={styles.forgot}>Şifremi unuttum</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
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
                <Text style={styles.primaryBtnText}>Giriş Yap</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>veya</Text>
            <View style={styles.orLine} />
          </View>

          <Pressable
            style={styles.googleBtn}
            onPress={() => showComingSoon('Google ile giriş')}
          >
            <FontAwesome5 name="google" size={18} color="#4285F4" />
            <Text style={styles.googleBtnText}>Google ile devam et</Text>
          </Pressable>

          <Pressable
            style={styles.appleBtn}
            onPress={() => showComingSoon('Apple ile giriş')}
          >
            <Ionicons name="logo-apple" size={22} color={colors.white} />
            <Text style={styles.appleBtnText}>Apple ile devam et</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerMuted}>Hesabın yok mu? </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Kayıt Ol</Text>
            </Pressable>
          </View>
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
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
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
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  inputFlex: {
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 22,
  },
  forgot: {
    fontSize: 14,
    color: colors.textMuted,
  },
  primaryBtn: {
    borderRadius: 26,
    minHeight: 52,
    overflow: 'hidden',
    marginBottom: 24,
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
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  orText: {
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textMuted,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.googleBorder,
    borderRadius: 14,
    minHeight: 52,
    marginBottom: 12,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.black,
    borderRadius: 14,
    minHeight: 52,
    marginBottom: 28,
  },
  appleBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerMuted: {
    fontSize: 15,
    color: colors.textMuted,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
