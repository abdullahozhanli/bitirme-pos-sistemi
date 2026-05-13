import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { homeFonts, androidRipple } from '../constants/homeTheme';
import { useAuth, showComingSoon } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/apiErrorMessage';
import { isValidEmail } from '../utils/authValidation';

const PALETTE = {
  pageBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#1F2933',
  textSecondary: '#7A7168',
  textBody: '#7A7168',
  border: '#E8E0D6',
  success: '#2E7D32',
  btnPrimary: '#4CAF50',
  btnPrimaryText: '#FFFFFF',
};

const PRIMARY_GRADIENT = ['#2F8F39', PALETTE.btnPrimary, '#67C96B'];
const APPLE_BAR_GRADIENT = ['#2E3238', '#4A515C', '#6A7382'];

const colors = {
  background: PALETTE.pageBg,
  primary: PALETTE.btnPrimary,
  text: PALETTE.textPrimary,
  textMuted: PALETTE.textSecondary,
  inputBorder: '#D7E7D8',
  inputBg: '#F9FBF8',
  white: '#FFFFFF',
  divider: PALETTE.border,
  googleBorder: PALETTE.border,
};

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    const id = identifier.trim();
    if (!id || !password) {
      setError('E-posta ve şifre gerekli');
      return;
    }
    if (!isValidEmail(id)) {
      setError('Geçerli bir e-posta adresi girin');
      return;
    }
    setLoading(true);
    try {
      await login(id, password);
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
            <View style={styles.logoBleed}>
              <Image
                source={require('../görsel/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityRole="image"
                accessibilityLabel="Self Kasa logo"
              />
            </View>
          </View>

          <Text style={styles.title}>Hoş Geldiniz!</Text>
          <Text style={styles.subtitle}>
            Favori restoranlarını keşfetmek için giriş yap
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.field}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#3F8F4E"
              style={styles.fieldIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-posta adresin"
              placeholderTextColor={PALETTE.textSecondary}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          <View style={styles.field}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#3F8F4E"
              style={styles.fieldIcon}
            />
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Şifre"
              placeholderTextColor={PALETTE.textSecondary}
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
                color={PALETTE.textSecondary}
              />
            </Pressable>
          </View>

          <Pressable
            style={styles.forgotWrap}
            onPress={() => showComingSoon('Şifremi unuttum')}
            android_ripple={androidRipple}
          >
            <Text style={styles.forgot}>Şifremi unuttum</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              loading && styles.btnDisabled,
              pressed && !loading && { opacity: 0.92 },
            ]}
            onPress={handleLogin}
            disabled={loading}
            android_ripple={{ color: 'rgba(255,255,255,0.22)', foreground: true }}
          >
            <LinearGradient
              colors={PRIMARY_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            )}
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>veya</Text>
            <View style={styles.orLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.92 }]}
            onPress={() => showComingSoon('Google ile giriş')}
            android_ripple={{ ...androidRipple, borderless: false }}
          >
            <FontAwesome5 name="google" size={18} color="#4285F4" />
            <Text style={styles.googleBtnText}>Google ile devam et</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.appleBtnOuter, pressed && { opacity: 0.92 }]}
            onPress={() => showComingSoon('Apple ile giriş')}
            android_ripple={{ color: 'rgba(255,255,255,0.18)', foreground: true }}
          >
            <LinearGradient
              colors={APPLE_BAR_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="logo-apple" size={22} color={colors.white} />
            <Text style={styles.appleBtnText}>Apple ile devam et</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerMuted}>Hesabın yok mu? </Text>
            <Pressable onPress={() => navigation.navigate('Register')} android_ripple={androidRipple}>
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
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
    backgroundColor: PALETTE.pageBg,
  },
  logoWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginHorizontal: -16,
    marginBottom: 2,
    paddingTop: 2,
    paddingBottom: 4,
    backgroundColor: PALETTE.pageBg,
  },
  logoBleed: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 268,
    backgroundColor: PALETTE.pageBg,
    overflow: 'hidden',
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: 56,
    backgroundColor: PALETTE.pageBg,
  },
  title: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 22,
    letterSpacing: -0.35,
    color: '#1F6B38',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: PALETTE.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  error: {
    fontFamily: homeFonts.sansMedium,
    color: '#B42318',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginBottom: 12,
    minHeight: 48,
    shadowColor: '#1F2933',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: PALETTE.textPrimary,
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
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: PALETTE.textSecondary,
  },
  primaryBtn: {
    borderRadius: 999,
    minHeight: 52,
    overflow: 'hidden',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontFamily: homeFonts.sansSemi,
    color: PALETTE.btnPrimaryText,
    fontSize: 16,
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
    fontFamily: homeFonts.sans,
    paddingHorizontal: 14,
    fontSize: 13,
    color: PALETTE.textSecondary,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: colors.googleBorder,
    borderRadius: 999,
    minHeight: 52,
    marginBottom: 12,
    overflow: 'hidden',
  },
  googleBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: PALETTE.textPrimary,
  },
  appleBtnOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
    minHeight: 52,
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  appleBtnText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: PALETTE.btnPrimaryText,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerMuted: {
    fontFamily: homeFonts.sans,
    fontSize: 15,
    color: PALETTE.textSecondary,
  },
  footerLink: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: PALETTE.success,
  },
});
