import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
  inputBg: '#FAFAF9',
  inputBorder: '#E8E0D6',
};

const GRADIENT = ['#2F8F39', PALETTE.btnPrimary, '#67C96B'];

const MEAL_HEADER_ICON = 'receipt-outline';
const AI_KCAL_BADGE_ICON = require('../assets/icons/ai-kcal-badge.png');
const AI_KCAL_BADGE_MONO = require('../assets/icons/ai-kcal-badge-mono.png');

const SOFT_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

/**
 * Intro kartı sağ üst dönen dekor görselleri (`src/assets/intro-decor/` — Metro/Windows için ASCII yol).
 * En az 2 görsel olunca yumuşak fade ile döner; 0–1 görselde varsayılan `dal.png` kullanılır.
 */
const INTRO_DECOR_SLIDES = [
  require('../assets/intro-decor/Kalori_görsel_1.png'),
  require('../assets/intro-decor/Kalori_görsel_4.png'),
  require('../assets/intro-decor/Kalori_görsel_5.png'),
];

const INTRO_DECOR_FALLBACK = require('../görsel/dal.png');

function IntroDecorVisual() {
  const slides = INTRO_DECOR_SLIDES.filter(Boolean);
  if (slides.length >= 2) {
    return <IntroDecorCarousel slides={slides} />;
  }
  const single = slides.length === 1 ? slides[0] : INTRO_DECOR_FALLBACK;
  return (
    <View
      style={styles.introDecorWrap}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={single} style={styles.introDecorImage} resizeMode="contain" />
    </View>
  );
}

function IntroDecorCarousel({ slides }) {
  const [introSlide, setIntroSlide] = useState(0);
  const introFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    const fadeMs = 480;
    const holdMs = 3600;
    const n = slides.length;

    function advance() {
      if (cancelled) return;
      Animated.timing(introFade, {
        toValue: 0,
        duration: fadeMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        setIntroSlide((i) => (i + 1) % n);
        requestAnimationFrame(() => {
          if (cancelled) return;
          Animated.timing(introFade, {
            toValue: 1,
            duration: fadeMs,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }).start();
        });
      });
    }

    const id = setInterval(advance, holdMs + fadeMs * 2);
    return () => {
      cancelled = true;
      clearInterval(id);
      introFade.stopAnimation();
    };
  }, [introFade, slides.length]);

  return (
    <Animated.View
      style={[styles.introDecorWrap, { opacity: introFade }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={slides[introSlide]} style={styles.introDecorImage} resizeMode="contain" />
    </Animated.View>
  );
}

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
  const [inputMode, setInputMode] = useState('text');
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
    setInputMode('photo');
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
        <View
          style={styles.heroPill}
          accessibilityRole="header"
          accessibilityLabel="AI Kalori Asistanı"
        >
          <View style={styles.heroPillIconWrap}>
            <Image
              source={AI_KCAL_BADGE_ICON}
              style={styles.heroPillIcon}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={styles.heroPillText}>AI Kalori Asistanı</Text>
        </View>

        <View style={styles.introCard}>
          <IntroDecorVisual />
          <Text style={styles.introTitle}>
            Öğününüzü yazın veya fotoğraf ekleyin
          </Text>
          <Text style={styles.introDesc}>
            Yapay zeka, metin ve isteğe bağlı görselle yaklaşık kalori tahmini üretir.
            Sonuçlar bilgilendirme amaçlıdır.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <View style={styles.formCardHeaderIconWrap}>
              <Ionicons name={MEAL_HEADER_ICON} size={17} color="#6B6560" />
            </View>
            <View style={styles.formCardHeaderTitles}>
              <Text style={styles.fieldLabel}>Öğün açıklaması</Text>
              <View style={styles.fieldHintRow}>
                <View style={styles.formInfoIcon}>
                  <Text style={styles.formInfoBang}>!</Text>
                </View>
                <Text style={styles.fieldHint}>
                  Ürünleri yazın veya fotoğraf ekleyin. AI yaklaşık kalori tahmini oluştursun.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.segmentRow}>
            <Pressable
              style={({ pressed }) => [
                styles.segmentTab,
                inputMode === 'text' && styles.segmentTabActive,
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => setInputMode('text')}
            >
              <Ionicons
                name="document-text-outline"
                size={15}
                color={inputMode === 'text' ? PALETTE.textPrimary : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  inputMode === 'text' && styles.segmentTabTextActive,
                ]}
              >
                Metin girin
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.segmentTab,
                inputMode === 'photo' && styles.segmentTabActive,
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => setInputMode('photo')}
            >
              <Ionicons
                name="camera-outline"
                size={15}
                color={inputMode === 'photo' ? PALETTE.textPrimary : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  inputMode === 'photo' && styles.segmentTabTextActive,
                ]}
              >
                Fotoğraf ekle
              </Text>
            </Pressable>
          </View>

          {inputMode === 'text' ? (
            <View style={styles.textAreaShell}>
              <TextInput
                value={mealText}
                onChangeText={setMealText}
                placeholder=""
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={600}
                style={styles.textArea}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{mealText.length}/600</Text>
            </View>
          ) : (
            <View style={styles.photoPanel}>
              {previewUri ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: previewUri }} style={styles.preview} />
                  <Pressable
                    onPress={clearImage}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.previewRemoveBtn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.photoPickArea,
                    pressed && { opacity: 0.94 },
                  ]}
                  onPress={pickImage}
                  android_ripple={{ ...androidRipple, borderless: false }}
                >
                  <View style={styles.photoPickIconWrap}>
                    <Ionicons name="camera-outline" size={22} color="#6B7280" />
                  </View>
                  <Text style={styles.photoPickTitle}>Fotoğraf seç</Text>
                  <Text style={styles.photoPickHint}>Galeriden öğün fotoğrafı ekleyin</Text>
                </Pressable>
              )}
              {previewUri ? (
                <Pressable
                  onPress={pickImage}
                  style={({ pressed }) => [
                    styles.photoChangeLink,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.photoChangeLinkText}>Başka fotoğraf seç</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          <View style={styles.formCardFooter}>
            <View style={styles.formInfoRow}>
              <View style={styles.formInfoIcon}>
                <Text style={styles.formInfoBang}>!</Text>
              </View>
              <Text style={styles.formInfoText}>
                Detaylı açıklamalar daha doğru tahmin sağlar.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.ctaCompact,
                (loading || pressed) && { opacity: loading ? 1 : 0.92 },
              ]}
              onPress={runEstimate}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Tahmin et"
              android_ripple={{ color: 'rgba(255,255,255,0.22)', foreground: true }}
            >
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.ctaGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Image
                      source={AI_KCAL_BADGE_MONO}
                      style={styles.ctaIconMono}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                    />
                    <Text style={styles.ctaText}>Tahmin et</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <LinearGradient
              colors={['#F0F1F3', '#FFFFFF', '#F5F6F8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.resultIconWrap}>
              <Ionicons name="flame" size={22} color={PALETTE.textPrimary} />
            </View>
            <Text style={styles.resultLabel}>Tahmini kalori</Text>
            <Text style={styles.resultKcal}>
              {result.estimatedCalories}
              <Text style={styles.resultKcalUnit}> kcal</Text>
            </Text>
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceChip}>
                <Ionicons name="shield-checkmark-outline" size={14} color={PALETTE.textSecondary} />
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
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 12,
  },
  heroPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C5DDB0',
    shadowColor: '#7BA858',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  heroPillIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPillIcon: {
    width: 22,
    height: 22,
  },
  heroPillText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: '#3A3A3A',
    letterSpacing: 0.05,
  },
  introCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingHorizontal: 10,
    paddingVertical: 12,
    overflow: 'hidden',
    position: 'relative',
    ...SOFT_SHADOW,
  },
  introDecorWrap: {
    position: 'absolute',
    right: -8,
    top: 22,
    width: 156,
    height: 96,
    zIndex: 0,
  },
  introDecorImage: {
    width: '100%',
    height: '100%',
    opacity: 0.92,
  },
  introTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    lineHeight: 24,
    color: '#1F6B38',
    letterSpacing: -0.22,
    marginBottom: 7,
    paddingRight: 118,
    zIndex: 1,
  },
  introDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: PALETTE.textSecondary,
    paddingRight: 118,
    zIndex: 1,
  },
  formCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECE8E2',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    ...SOFT_SHADOW,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  formCardHeaderIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  formCardHeaderTitles: {
    flex: 1,
    minWidth: 0,
    paddingTop: 3,
  },
  fieldLabel: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#4A4540',
    letterSpacing: -0.12,
  },
  fieldHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 3,
  },
  fieldHint: {
    flex: 1,
    fontFamily: homeFonts.sans,
    fontSize: 11,
    lineHeight: 15,
    color: '#7A7168',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E5E9',
    backgroundColor: '#F4F5F7',
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B0B8C4',
  },
  segmentTabText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: PALETTE.textSecondary,
  },
  segmentTabTextActive: {
    fontFamily: homeFonts.sansSemi,
    color: PALETTE.textPrimary,
  },
  textAreaShell: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  textArea: {
    minHeight: 88,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: PALETTE.textPrimary,
    lineHeight: 20,
  },
  charCount: {
    fontFamily: homeFonts.sans,
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'right',
    paddingHorizontal: 10,
    paddingBottom: 6,
    paddingTop: 0,
  },
  formCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  formInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  formInfoIcon: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: PALETTE.btnPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  formInfoBang: {
    fontFamily: homeFonts.sansBold,
    fontSize: 14,
    lineHeight: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginTop: 0.5,
  },
  formInfoText: {
    flex: 1,
    fontFamily: homeFonts.sans,
    fontSize: 11,
    lineHeight: 15,
    color: '#7A7168',
  },
  photoPanel: {
    gap: 6,
  },
  photoPickArea: {
    minHeight: 108,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4CCC2',
    backgroundColor: '#FAFAF9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  photoPickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F1F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  photoPickTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: PALETTE.textPrimary,
    marginBottom: 2,
  },
  photoPickHint: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: PALETTE.textSecondary,
    textAlign: 'center',
  },
  photoChangeLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  photoChangeLinkText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#1F6B38',
  },
  previewWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E0D6',
    backgroundColor: '#F4F4F5',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 128,
    backgroundColor: '#F4F4F5',
  },
  previewRemoveBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCompact: {
    flexShrink: 0,
    borderRadius: 999,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 11,
  },
  ctaIconMono: {
    width: 18,
    height: 18,
  },
  ctaText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.05,
  },
  resultCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
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
    backgroundColor: 'rgba(31, 41, 51, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(31, 41, 51, 0.08)',
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
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  confidenceText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 12,
    color: PALETTE.textSecondary,
  },
});
