import { useCallback } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  homeFonts,
  uiShadow,
  pressScale,
  androidRipple,
} from '../constants/homeTheme';
import { useAuth, showComingSoon } from '../context/AuthContext';
import { useTableSession } from '../context/TableSessionContext';
import { getLoyaltyPoints } from '../utils/loyaltyPoints';
import LottieView from 'lottie-react-native';

/** Ana ekran — soft shadow */
const homeShadowCard = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 16,
  elevation: 2,
};
const DEFAULT_CAMPAIGNS = 3;
/** QR CTA — MenuScreen AI butonu ile aynı renk ve yatay geçiş */
const GRADIENT = ['#2F8F39', '#4CAF50', '#67C96B'];
const QR_CARD_GRADIENT = ['#FFFFFF', '#F3FAF5'];

const WELCOME_TITLE = 'Self kasaya hoş geldiniz!';

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const c = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpRgb(t, a, b) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** `GRADIENT` durakları boyunca t ∈ [0, 1] */
function welcomeTitleGreenAt(t) {
  const stops = GRADIENT;
  if (!stops.length) return '#2F8F39';
  if (stops.length === 1) return stops[0];
  const u = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const seg = Math.min(Math.floor(u), stops.length - 2);
  const k = u - seg;
  const A = hexToRgb(stops[seg]);
  const B = hexToRgb(stops[seg + 1]);
  return rgbToHex(lerpRgb(k, A, B));
}

function welcomeTitleCharColor(charIndex, totalLength) {
  if (totalLength <= 1) return welcomeTitleGreenAt(0);
  return welcomeTitleGreenAt(charIndex / (totalLength - 1));
}

/** Yeni renk paleti */
const PALETTE = {
  pageBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textBody: '#4B5563',
  border: '#E5E7EB',
  accent: '#2563EB',
  success: '#16A34A',
  campaign: '#D97706',
  softGreen: '#ECFDF3',
  softBlue: '#EFF6FF',
  btnPrimary: '#111827',
  btnPrimaryText: '#FFFFFF',
  tagBg: '#FEF3C7',
  tagText: '#92400E',
};

/** Ad / soyad: API'de ayrı alan varsa öncelik; yoksa `name` içindeki ilk kelime + kalan */
function namePartsFromUser(user) {
  if (!user) return { first: 'Misafir', last: '' };
  const apiLast = String(user.surname ?? user.lastName ?? user.soyad ?? '').trim();
  const rawName = String(user.name ?? '').trim();
  if (apiLast && rawName) return { first: rawName, last: apiLast };
  if (rawName) {
    const i = rawName.indexOf(' ');
    if (i === -1) return { first: rawName, last: '' };
    return {
      first: rawName.slice(0, i).trim(),
      last: rawName.slice(i + 1).trim() || '',
    };
  }
  if (user.email) return { first: user.email.split('@')[0], last: '' };
  return { first: 'Misafir', last: '' };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { tableNumber, clearTableSession } = useTableSession();

  const { first: firstName, last: lastName } = namePartsFromUser(user);
  const points = getLoyaltyPoints(user);
  const campaignCount = user?.campaignsCount ?? user?.campaignCount ?? DEFAULT_CAMPAIGNS;

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.brandLogoRow}>
          <View style={styles.brandLogoFrame}>
            <Image
              source={require('../görsel/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={[styles.profileCard, homeShadowCard]}>
          <Pressable
            style={({ pressed }) => [
              styles.profileCardPress,
              pressScale(pressed),
            ]}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.avatar}>
              {user?.avatarUrl?.trim() ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={22}
                  color={PALETTE.textPrimary}
                />
              )}
            </View>
            <View style={styles.headerTextCol}>
              <Text
                style={styles.profileFullNameLine}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                <Text style={styles.profileFirstName}>{firstName}</Text>
                {lastName ? (
                  <Text style={styles.profileLastName}>{` ${lastName}`}</Text>
                ) : null}
              </Text>
              <Text style={styles.profileMeta}>
                <Text style={styles.profileMetaLabel}>Parapuan </Text>
                <Text style={styles.profileMetaPoints}>{points}</Text>
                <Text style={styles.profileMetaMuted}>
                  {' '}
                  · {campaignCount} kampanya
                </Text>
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={PALETTE.textSecondary}
              style={styles.profileChevron}
            />
          </Pressable>
        </View>

        <View style={[styles.featuredOuter, uiShadow.lift]}>
          <LinearGradient
            colors={QR_CARD_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredCard}
          >
            {tableNumber ? (
              <View style={styles.tableStatusRow}>
                <View style={styles.tableStatusLeft}>
                  <Ionicons
                    name="restaurant-outline"
                    size={13}
                    color={PALETTE.textSecondary}
                    style={styles.tableStatusIcon}
                  />
                  <Text style={styles.tableStatusLabel}>Bağlı Masa</Text>
                  <View style={styles.tableStatusBadge}>
                    <Text style={styles.tableStatusBadgeText}>
                      Masa {tableNumber}
                    </Text>
                  </View>
                  <View style={styles.tableStatusDot} />
                  <Text
                    style={styles.tableStatusHint}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    QR ile bağlandı
                  </Text>
                </View>
                <Pressable
                  onPress={clearTableSession}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.tableStatusClear,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.tableStatusClearText}>Kaldır</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.featuredCenter}>
              <View style={styles.featuredQrFrame}>
                <View style={styles.featuredQrIconWrap}>
                  <LottieView
                    source={require('../görsel/qr-scan.json')}
                    autoPlay
                    loop
                    style={styles.featuredQrLottie}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View style={styles.featuredTitleRow}>
                {Array.from(WELCOME_TITLE).map((ch, i) => (
                  <Text
                    key={`${i}-${ch}`}
                    style={[
                      styles.featuredTitleChar,
                      {
                        color:
                          ch === ' '
                            ? 'rgba(255,255,255,0)'
                            : welcomeTitleCharColor(i, WELCOME_TITLE.length),
                      },
                    ]}
                  >
                    {ch}
                  </Text>
                ))}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.ctaPillPressable,
                  pressed && styles.ctaPillPressablePressed,
                ]}
                onPress={() => navigation.navigate('QRScanner')}
                android_ripple={{ color: 'rgba(255,255,255,0.22)', foreground: true }}
              >
                <LinearGradient
                  colors={GRADIENT}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.ctaPillGradient}
                >
                  <Ionicons name="scan-outline" size={19} color={PALETTE.btnPrimaryText} />
                  <Text style={styles.ctaPillText}>QR Kodu Tara</Text>
                </LinearGradient>
              </Pressable>
              <Text style={styles.featuredHint}>
                Menüye erişmek için masadaki kodu okutmanız gerekir
              </Text>
            </View>
          </LinearGradient>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.campaignCard,
            homeShadowCard,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          onPress={() => showComingSoon('Kampanya detaylari')}
          android_ripple={androidRipple}
        >
          <View style={styles.campaignTopRow}>
            <View style={styles.campaignBadge}>
              <Text style={styles.campaignBadgeText}>MOBİL UYGULAMAYA ÖZEL</Text>
            </View>
          </View>
          <Text style={styles.campaignTitle}>İlk siparişe %20 indirim</Text>
          <Text style={styles.campaignDesc}>
            QR ile bağlandıktan sonra uygulamaya özel fırsatları keşfedin.
          </Text>
          <View style={styles.campaignCta}>
            <Text style={styles.campaignCtaText}>Detayları Gör</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={PALETTE.success}
            />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.qrLink,
            homeShadowCard,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
          onPress={() => navigation.navigate('Profile')}
          android_ripple={androidRipple}
        >
          <Ionicons name="receipt-outline" size={20} color={PALETTE.textPrimary} />
          <View style={styles.qrLinkTextWrap}>
            <Text style={styles.qrLinkText}>Profil ve Geçmiş Siparişler</Text>
            <Text style={styles.qrLinkSubtext}>Hesap ayarları ve sipariş takibi</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={PALETTE.textSecondary}
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.pageBg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  brandLogoRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandLogoFrame: {
    width: 146,
    height: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  brandLogo: {
    width: 146,
    height: 44,
    opacity: 0.98,
    marginTop: -4,
  },
  profileCard: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: PALETTE.cardBg,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  profileCardPress: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    width: '100%',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PALETTE.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  headerTextCol: {
    marginLeft: 10,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  profileFullNameLine: {
    fontSize: 16,
    lineHeight: 20,
  },
  profileFirstName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: PALETTE.textPrimary,
  },
  profileLastName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: PALETTE.textPrimary,
  },
  profileMeta: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: PALETTE.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  profileMetaLabel: {
    fontFamily: homeFonts.sans,
    color: PALETTE.textSecondary,
  },
  profileMetaPoints: {
    fontFamily: homeFonts.sans,
    color: PALETTE.textSecondary,
  },
  profileMetaMuted: {
    fontFamily: homeFonts.sans,
    color: PALETTE.textSecondary,
  },
  profileChevron: {
    marginLeft: 4,
    alignSelf: 'center',
  },
  tableStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 2,
  },
  tableStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  tableStatusIcon: {
    flexShrink: 0,
  },
  tableStatusLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 11,
    color: PALETTE.textSecondary,
    flexShrink: 0,
  },
  tableStatusBadge: {
    backgroundColor: '#D1FADF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  tableStatusDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: PALETTE.success,
    marginHorizontal: 1,
    flexShrink: 0,
  },
  tableStatusBadgeText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 11,
    color: '#047857',
    letterSpacing: 0.1,
  },
  tableStatusHint: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: PALETTE.textSecondary,
    flexShrink: 1,
    minWidth: 0,
  },
  tableStatusClear: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexShrink: 0,
  },
  tableStatusClearText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 11,
    color: PALETTE.textSecondary,
  },
  featuredOuter: {
    borderRadius: 28,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: PALETTE.cardBg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  featuredCard: {
    borderRadius: 28,
  },
  featuredCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 24,
  },
  featuredQrFrame: {
    padding: 12,
    borderRadius: 26,
    borderWidth: 0,
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  featuredTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: '92%',
    marginBottom: 22,
  },
  featuredTitleChar: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 23,
    lineHeight: 29,
  },
  featuredHint: {
    marginTop: 14,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: PALETTE.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
  featuredSecondaryAction: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  featuredSecondaryActionText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: '#374151',
  },
  featuredQrIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  featuredQrLottie: {
    width: 100,
    height: 100,
  },
  ctaPillPressable: {
    alignSelf: 'stretch',
    marginHorizontal: 2,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#2F9A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 11,
    elevation: 5,
  },
  ctaPillPressablePressed: {
    opacity: 0.9,
  },
  ctaPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 26,
  },
  ctaPillText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: PALETTE.btnPrimaryText,
    letterSpacing: 0.15,
  },
  campaignCard: {
    marginBottom: 16,
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  campaignTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  campaignBadge: {
    backgroundColor: PALETTE.tagBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  campaignBadgeText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 11,
    color: PALETTE.tagText,
    letterSpacing: 0.2,
  },
  campaignTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: PALETTE.textPrimary,
    marginBottom: 4,
  },
  campaignDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: PALETTE.textSecondary,
    marginBottom: 12,
  },
  campaignCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  campaignCtaText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: PALETTE.success,
  },
  qrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    marginTop: 4,
  },
  qrLinkTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  qrLinkText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: PALETTE.textPrimary,
  },
  qrLinkSubtext: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: PALETTE.textSecondary,
    marginTop: 2,
  },
});
