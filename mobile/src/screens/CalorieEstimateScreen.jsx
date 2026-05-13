import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  homeFonts,
  pressScale,
  androidRipple,
} from '../constants/homeTheme';
import { estimateCalories } from '../api/calorie';

const PALETTE = {
  pageBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#1F2933',
  textSecondary: '#7A7168',
  border: '#E8E0D6',
  accent: '#FFC107',
  success: '#2E7D32',
  btnPrimary: '#4CAF50',
  btnPrimarySoft: '#43A047',
  softGreen: '#F4F9F5',
  softAmber: '#E8F5E9',
  inputBg: '#F9FBF8',
  inputBorder: '#D7E7D8',
};

const GRADIENT = ['#2F8F39', PALETTE.btnPrimary, '#67C96B'];

const SOFT_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

function confidenceLabel(code) {
  const c = String(code || '').toLowerCase();
  if (c === 'high') return 'Yüksek';
  if (c === 'medium') return 'Orta';
  if (c === 'low') return 'Düşük';
  return String(code || '—');
}

export default function CalorieEstimateScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [mealText, setMealText] = useState('');
  const [previewUri, setPreviewUri] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const confidenceText = useMemo(
    () => (result ? confidenceLabel(result.confidence) : ''),
    [result]
  );

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni vermelisiniz.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (picked.canceled || !picked.assets?.length) return;
    setPreviewUri(picked.assets[0].uri || '');
    setImageBase64(picked.assets[0].base64 || '');
    setResult(null);
  }

  async function runEstimate() {
    if (!mealText.trim() && !imageBase64) {
      Alert.alert('Eksik Bilgi', 'Metin yazın veya fotoğraf ekleyin.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await estimateCalories({ text: mealText, imageBase64 });
      setResult(data);
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Tahmin alınamadı. Lütfen tekrar deneyin.';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  }

  function clearImage() {
    setPreviewUri('');
    setImageBase64('');
    setResult(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressScale(pressed)]}
          onPress={() => navigation.goBack()}
          android_ripple={androidRipple}
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={20} color={PALETTE.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerLogoFrame}>
            <Image
              source={require('../görsel/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroPill}>
          <Ionicons name="sparkles" size={14} color={PALETTE.success} />
          <Text style={styles.heroPillText}>AI Menü Asistanı</Text>
        </View>

        <View style={styles.introCard}>
          <Image
            source={require('../görsel/dal.png')}
            style={styles.introLeaf}
            resizeMode="contain"
            blurRadius={0.8}
          />
          <Text style={styles.introTitle}>
            Öğününüzü yazın veya fotoğraflayın
          </Text>
          <Text style={styles.introDesc}>
            Yapay zeka, metin ve isteğe bağlı görselle yaklaşık kalori tahmini üretir.
            Sonuçlar bilgilendirme amaçlıdır.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Öğün açıklaması</Text>
          <TextInput
            value={mealText}
            onChangeText={setMealText}
            placeholder="Örn: 1 porsiyon tavuk döner, az pilav, ayran"
            placeholderTextColor={PALETTE.textSecondary}
            multiline
            maxLength={600}
            style={styles.textArea}
            textAlignVertical="top"
          />

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.92 }]}
              onPress={pickImage}
              android_ripple={{ ...androidRipple, borderless: false }}
            >
              <Ionicons name="image-outline" size={18} color="#3F8F4E" />
              <Text style={styles.outlineBtnText}>Fotoğraf seç</Text>
            </Pressable>
            {imageBase64 ? (
              <Pressable onPress={clearImage} hitSlop={8} style={styles.textLinkWrap}>
                <Text style={styles.textLink}>Kaldır</Text>
              </Pressable>
            ) : null}
          </View>

          {previewUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: previewUri }} style={styles.preview} />
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.ctaOuter,
              (loading || pressed) && { opacity: loading ? 1 : 0.92 },
            ]}
            onPress={runEstimate}
            disabled={loading}
            android_ripple={{ color: 'rgba(255,255,255,0.22)', foreground: true }}
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="nutrition-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.ctaText}>Tahmin et</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <LinearGradient
              colors={['#E8F5E9', '#FFFFFF', '#F4F9F5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.resultIconWrap}>
              <Ionicons name="flame" size={22} color={PALETTE.success} />
            </View>
            <Text style={styles.resultLabel}>Tahmini kalori</Text>
            <Text style={styles.resultKcal}>
              {result.estimatedCalories}
              <Text style={styles.resultKcalUnit}> kcal</Text>
            </Text>
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceChip}>
                <Ionicons name="shield-checkmark-outline" size={14} color={PALETTE.success} />
                <Text style={styles.confidenceText}>Güven: {confidenceText}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PALETTE.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLogoFrame: {
    width: 146,
    height: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: PALETTE.pageBg,
    borderBottomWidth: 1,
    borderBottomColor: '#CFCFCF',
  },
  headerLogo: {
    width: 146,
    height: 44,
    opacity: 0.98,
    marginTop: -4,
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  heroPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE.softAmber,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
  },
  heroPillText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 12,
    color: PALETTE.success,
    letterSpacing: 0.2,
  },
  introCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE9DC',
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: 'hidden',
    position: 'relative',
    ...SOFT_SHADOW,
  },
  introLeaf: {
    position: 'absolute',
    right: -6,
    top: 8,
    width: 140,
    height: 100,
    opacity: 0.88,
  },
  introTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    lineHeight: 25,
    color: '#1F6B38',
    letterSpacing: -0.25,
    marginBottom: 8,
    paddingRight: 72,
  },
  introDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: PALETTE.textSecondary,
    paddingRight: 24,
  },
  formCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    padding: 14,
    gap: 12,
    ...SOFT_SHADOW,
  },
  fieldLabel: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: PALETTE.textPrimary,
    letterSpacing: -0.1,
  },
  textArea: {
    minHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    backgroundColor: PALETTE.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: PALETTE.textPrimary,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    backgroundColor: PALETTE.inputBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outlineBtnText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: '#2E7D32',
  },
  textLinkWrap: {
    paddingVertical: 4,
  },
  textLink: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: PALETTE.textSecondary,
    textDecorationLine: 'underline',
  },
  previewWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.softGreen,
  },
  preview: {
    width: '100%',
    height: 168,
    backgroundColor: PALETTE.softGreen,
  },
  ctaOuter: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 2,
    minHeight: 48,
  },
  ctaGradient: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  ctaText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  resultCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE9DC',
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...SOFT_SHADOW,
  },
  resultIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resultLabel: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: PALETTE.textSecondary,
    marginBottom: 4,
  },
  resultKcal: {
    fontFamily: homeFonts.sansBold,
    fontSize: 36,
    color: PALETTE.textPrimary,
    letterSpacing: -1,
  },
  resultKcalUnit: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: PALETTE.textSecondary,
    letterSpacing: 0,
  },
  confidenceRow: {
    marginTop: 14,
  },
  confidenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE.softAmber,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
  },
  confidenceText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 12,
    color: PALETTE.success,
  },
});
