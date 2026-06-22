import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  homeFonts,
  pressScale,
  androidRipple,
} from '../constants/homeTheme';
import { sendNutritionChat } from '../api/calorie';
import { useAuth } from '../context/AuthContext';
import { useTableSession } from '../context/TableSessionContext';
import { useCart } from '../context/CartContext';

const PALETTE = {
  pageBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#1F2933',
  textSecondary: '#7A7168',
  border: '#E8E0D6',
  btnPrimary: '#4CAF50',
  userBubble: '#E8F5E9',
  assistantBubble: '#F8F7F5',
  chipBg: '#F4F9F5',
};

const GRADIENT = ['#2F8F39', PALETTE.btnPrimary, '#67C96B'];
const AI_KCAL_BADGE_ICON = require('../assets/icons/ai-kcal-badge.png');

const SOFT_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};

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

function resolveBranchLabel(branchName) {
  const trimmed = String(branchName || '').trim();
  return trimmed || 'işletmemiz';
}

function resolveFirstName(userName) {
  const trimmed = String(userName || '').trim();
  return trimmed.split(/\s+/)[0] || '';
}

function buildWelcomeMessage(branchName, userName) {
  const branch = resolveBranchLabel(branchName);
  const firstName = resolveFirstName(userName);
  const greeting = firstName ? `Merhaba ${firstName}!` : 'Merhaba!';
  const text = `${greeting} ${branch} Kalori Asistanı'na hoş geldin. Menüden kalori sorabilir veya hedefine uygun öneri isteyebilirsin.`;

  return {
    id: 'welcome',
    role: 'assistant',
    text,
    products: [],
  };
}

function IntroHeroHeader({ branchName, userName }) {
  const branch = resolveBranchLabel(branchName);
  const firstName = resolveFirstName(userName);

  return (
    <View style={styles.introSection}>
      <View
        style={styles.heroPill}
        accessibilityRole="header"
        accessibilityLabel={`${branch} Kalori Asistanı`}
      >
        <View style={styles.heroPillIconWrap}>
          <Image
            source={AI_KCAL_BADGE_ICON}
            style={styles.heroPillIcon}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
        <Text style={styles.heroPillText}>{branch} Kalori Asistanı</Text>
      </View>

      <View style={styles.introCard}>
        <IntroDecorVisual />
        <Text style={styles.introTitle}>
          {firstName ? `${firstName}, menüne sor` : 'Menüne sor, kalori öğren'}
        </Text>
        <Text style={styles.introDesc}>
          Yapay zeka {branch} menüsündeki besin değerlerini kullanır. Ürün kalorisi sorabilir
          veya hedef kalorine uygun öneri alabilirsin.
        </Text>
      </View>
    </View>
  );
}

function ProductChip({ product }) {
  return (
    <View style={styles.productChip}>
      <Ionicons name="flame" size={13} color="#2E7D32" />
      <Text style={styles.productChipName} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.productChipKcal}>{product.calories} kcal</Text>
    </View>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser ? (
        <View style={styles.assistantAvatar}>
          <Image source={AI_KCAL_BADGE_ICON} style={styles.assistantAvatarImg} resizeMode="contain" />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{message.text}</Text>
        {message.products?.length > 0 ? (
          <View style={styles.productChipList}>
            {message.products.map((p) => (
              <ProductChip key={p.id} product={p} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function CalorieEstimateScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { branchId, branchName } = useTableSession();
  const { lines } = useCart();
  const [messages, setMessages] = useState(() => [buildWelcomeMessage(null, null)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const listRef = useRef(null);

  const hasUserMessages = useMemo(
    () => messages.some((message) => message.role === 'user'),
    [messages]
  );

  const cartItems = useMemo(
    () =>
      lines.map((line) => ({
        productId: String(line._id),
        name: line.name,
        qty: line.qty,
        calories: line.nutrition?.calories ?? null,
      })),
    [lines]
  );

  const historyForApi = useMemo(
    () =>
      messages
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.text,
        })),
    [messages]
  );

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated });
    });
  }, []);

  useEffect(() => {
    setMessages((prev) => {
      const hasUser = prev.some((message) => message.role === 'user');
      if (hasUser) return prev;

      const welcome = buildWelcomeMessage(branchName, user?.name);
      const rest = prev.filter((message) => message.id !== 'welcome');
      return [welcome, ...rest];
    });
  }, [branchName, user?.name]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (event) => {
      const height = Number(event?.endCoordinates?.height) || 0;
      const inset =
        Platform.OS === 'ios' ? Math.max(0, height - insets.bottom) : height;
      setKeyboardInset(inset);
      scrollToEnd();
      setTimeout(() => scrollToEnd(), 120);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [insets.bottom, scrollToEnd]);

  const sendMessage = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || loading) return;

      if (!branchId) {
        Alert.alert(
          'Şube gerekli',
          'Menü kalori asistanı için önce masanızdaki QR kodu okutarak şubeye bağlanın.'
        );
        return;
      }

      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text,
        products: [],
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      scrollToEnd();

      try {
        const data = await sendNutritionChat({
          branchId,
          message: text,
          history: historyForApi,
          cartItems,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text: data.reply || 'Yanıt alınamadı.',
            products: Array.isArray(data.products) ? data.products : [],
          },
        ]);
      } catch (err) {
        const message =
          err?.response?.data?.message || 'Yanıt alınamadı. Lütfen tekrar deneyin.';
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-err-${Date.now()}`,
            role: 'assistant',
            text: message,
            products: [],
          },
        ]);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [loading, branchId, historyForApi, cartItems, scrollToEnd]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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

      <View style={styles.flex}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 16 + keyboardInset },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListHeaderComponent={
            hasUserMessages ? null : (
              <IntroHeroHeader branchName={branchName} userName={user?.name} />
            )
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={PALETTE.btnPrimary} />
                <Text style={styles.typingText}>Yanıt hazırlanıyor…</Text>
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.composer,
            {
              marginBottom: keyboardInset,
              paddingBottom: keyboardInset > 0 ? 10 : Math.max(insets.bottom, 10),
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ürün kalorisi veya öneri iste…"
            placeholderTextColor="#9CA3AF"
            style={styles.composerInput}
            multiline
            maxLength={600}
            editable={!loading}
            onFocus={() => scrollToEnd()}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
              pressed && input.trim() && !loading && { opacity: 0.92 },
            ]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="Gönder"
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.sendBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="send" size={16} color="#FFFFFF" />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.pageBg,
  },
  flex: { flex: 1 },
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
  introSection: {
    gap: 12,
    marginBottom: 4,
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
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '92%',
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    maxWidth: '86%',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4F9F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C5DDB0',
  },
  assistantAvatarImg: {
    width: 20,
    height: 20,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    flex: 1,
  },
  bubbleAssistant: {
    backgroundColor: PALETTE.assistantBubble,
    borderColor: '#ECE8E2',
  },
  bubbleUser: {
    backgroundColor: PALETTE.userBubble,
    borderColor: '#C8E6C9',
  },
  bubbleText: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: PALETTE.textPrimary,
  },
  bubbleTextUser: {
    fontFamily: homeFonts.sansMedium,
  },
  productChipList: {
    marginTop: 10,
    gap: 6,
  },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE8DD',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  productChipName: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 12,
    color: PALETTE.textPrimary,
  },
  productChipKcal: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 11,
    color: '#2E7D32',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 36,
  },
  typingText: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: PALETTE.textSecondary,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.border,
    backgroundColor: PALETTE.pageBg,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: 10,
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: PALETTE.textPrimary,
  },
  sendBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  sendBtnGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
