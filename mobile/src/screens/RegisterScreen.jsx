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
import { homeFonts, androidRipple } from '../constants/homeTheme';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/apiErrorMessage';
import {
  getPasswordCriteriaState,
  isValidEmail,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from '../utils/authValidation';

const PALETTE = {
  pageBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#1F2933',
  textSecondary: '#7A7168',
  border: '#E8E0D6',
  success: '#2E7D32',
  btnPrimary: '#4CAF50',
  btnPrimaryText: '#FFFFFF',
};

const PRIMARY_GRADIENT = ['#2F8F39', PALETTE.btnPrimary, '#67C96B'];

const colors = {
  background: PALETTE.pageBg,
  primary: PALETTE.btnPrimary,
  text: PALETTE.textPrimary,
  textMuted: PALETTE.textSecondary,
  inputBorder: '#D8EBDA',
  inputBg: '#FFFFFF',
  white: '#FFFFFF',
  divider: PALETTE.border,
  fieldIcon: '#8A847C',
};

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
    if (!isValidEmail(email.trim())) {
      setError('Geçerli bir e-posta adresi girin');
      return;
    }
    if (!isStrongPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
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

  const pwdRules = getPasswordCriteriaState(password);
  const passwordHints = [
    { key: 'minLength', met: pwdRules.minLength, label: '8+ karakter' },
    { key: 'lower', met: pwdRules.lower, label: 'Küçük harf' },
    { key: 'upper', met: pwdRules.upper, label: 'Büyük harf' },
    { key: 'digit', met: pwdRules.digit, label: 'Rakam' },
    { key: 'symbol', met: pwdRules.symbol, label: 'Sembol' },
  ];

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
            style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.goBack()}
            hitSlop={12}
            android_ripple={{ ...androidRipple, borderless: true }}
          >
            <Ionicons name="chevron-back" size={22} color={PALETTE.textPrimary} />
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
              color={colors.fieldIcon}
              style={styles.fieldIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad (isteğe bağlı)"
              placeholderTextColor={PALETTE.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={colors.fieldIcon}
              style={styles.fieldIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-posta adresin"
              placeholderTextColor={PALETTE.textSecondary}
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
              color={colors.fieldIcon}
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

          {password.length > 0 ? (
            <View style={styles.passwordCriteria}>
              {passwordHints.map(({ key, met, label }) => (
                <View key={key} style={styles.passwordCriteriaRow}>
                  <Text
                    style={[
                      styles.passwordCriteriaBullet,
                      met && styles.passwordCriteriaBulletMet,
                    ]}
                  >
                    {met ? '✓' : '·'}
                  </Text>
                  <Text
                    style={[styles.passwordCriteriaText, met && styles.passwordCriteriaTextMet]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              loading && styles.btnDisabled,
              pressed && !loading && { opacity: 0.92 },
            ]}
            onPress={handleRegister}
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
              <Text style={styles.primaryBtnText}>Kayıt Ol</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerMuted}>Zaten hesabın var mı? </Text>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              android_ripple={androidRipple}
            >
              <Text style={styles.footerLink}>Giriş Yap</Text>
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
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
    backgroundColor: PALETTE.pageBg,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 2,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 15,
    color: PALETTE.textPrimary,
  },
  title: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 22,
    letterSpacing: -0.35,
    color: PALETTE.textPrimary,
    textAlign: 'center',
    marginTop: 10,
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
  fieldIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: PALETTE.textPrimary,
    paddingVertical: 12,
  },
  inputFlex: { flex: 1 },
  eyeBtn: {
    padding: 4,
  },
  passwordCriteria: {
    marginTop: 6,
    marginBottom: 2,
    marginLeft: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 41, 51, 0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(31, 41, 51, 0.08)',
    gap: 3,
  },
  passwordCriteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 16,
  },
  passwordCriteriaBullet: {
    width: 14,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: 'rgba(122, 113, 104, 0.4)',
    marginRight: 6,
    fontFamily: homeFonts.sans,
  },
  passwordCriteriaBulletMet: {
    color: 'rgba(74, 84, 92, 0.75)',
    fontFamily: homeFonts.sansMedium,
  },
  passwordCriteriaText: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: 'rgba(122, 113, 104, 0.88)',
    flex: 1,
  },
  passwordCriteriaTextMet: {
    color: 'rgba(55, 65, 75, 0.88)',
  },
  primaryBtn: {
    borderRadius: 999,
    minHeight: 52,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    fontFamily: homeFonts.sansSemi,
    color: PALETTE.btnPrimaryText,
    fontSize: 16,
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
