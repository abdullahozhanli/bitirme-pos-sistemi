import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  menuColors,
  homeFonts,
  uiShadow,
  pressScale,
  androidRipple,
} from '../constants/homeTheme';
import { useAuth, showComingSoon } from '../context/AuthContext';
import { useTableSession } from '../context/TableSessionContext';
import { getLoyaltyPoints } from '../utils/loyaltyPoints';

/** Ana ekran — soft: ~0 6px 20px rgba(0,0,0,0.06) */
const homeShadowCard = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 20,
  elevation: 2,
};
const DEFAULT_CAMPAIGNS = 3;
const GRADIENT = ['#3FA34D', '#2E7D32'];
const QR_CARD_GRADIENT = ['#5FCB7A', '#3FAF60', '#2D7E4A'];
const BUTTON_GRADIENT = ['#F7F8F2', '#E8ECD9'];
const OBSIDIAN = '#1F2937';

function displayName(user) {
  if (user?.name?.trim()) return user.name.trim();
  if (user?.email) return user.email.split('@')[0];
  return 'Misafir';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { tableNumber, clearTableSession } = useTableSession();
  const qrPulse = useRef(new Animated.Value(0)).current;

  const name = displayName(user);
  const points = getLoyaltyPoints(user);
  const campaignCount = user?.campaignsCount ?? user?.campaignCount ?? DEFAULT_CAMPAIGNS;

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(qrPulse, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(qrPulse, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [qrPulse]);

  const qrPulseStyle = {
    transform: [
      {
        scale: qrPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.07],
        }),
      },
    ],
    opacity: qrPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.28, 0.62],
    }),
  };
  const scanLineStyle = {
    transform: [
      {
        translateY: qrPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, 30],
        }),
      },
    ],
    opacity: qrPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0.75],
    }),
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.profileCard, homeShadowCard]}>
          <Pressable
            style={({ pressed }) => [
              styles.profileCardPress,
              pressScale(pressed),
            ]}
            onPress={() => navigation.navigate('Profile')}
            android_ripple={androidRipple}
          >
            <LinearGradient
              colors={['#4AB96B', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatar, styles.avatarGlow]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={menuColors.white}
              />
            </LinearGradient>
            <View style={styles.headerTextCol}>
              <Text
                style={styles.profileGreeting}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                Merhaba, {name}
              </Text>
              <Text style={styles.profileMeta}>
                {points} puan • {campaignCount} kampanya
              </Text>
            </View>
          </Pressable>
        </View>

        {tableNumber ? (
          <View style={[styles.tableChip, homeShadowCard]}>
            <Text style={styles.tableChipText}>Masa {tableNumber}</Text>
            <Pressable onPress={() => navigation.navigate('QRScanner')}>
              <Text style={styles.tableLink}>QR</Text>
            </Pressable>
            <Text style={styles.tableDot}>·</Text>
            <Pressable onPress={clearTableSession}>
              <Text style={styles.tableMuted}>Kaldır</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.featuredOuter, uiShadow.lift]}>
          <LinearGradient
            colors={QR_CARD_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredCard}
          >
            <View style={styles.featuredCenter}>
              <View style={styles.featuredQrStack}>
                <Animated.View style={[styles.featuredQrPulseRing, qrPulseStyle]} />
                <View style={styles.featuredQrIconWrap}>
                  <View style={styles.featuredQrInnerShade} />
                  <Animated.View style={[styles.featuredQrScanLine, scanLineStyle]} />
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={48}
                    color="#F5F8EA"
                  />
                </View>
              </View>
              <Text style={styles.featuredTitle}>Siparişe Başla</Text>
              <Text style={styles.featuredDesc}>
                Masadaki QR kodunu taratarak menüye anında ulaşın.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.ctaPill,
                  { transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}
                onPress={() => navigation.navigate('QRScanner')}
                android_ripple={androidRipple}
              >
                <LinearGradient
                  colors={BUTTON_GRADIENT}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.ctaPillGradient}
                >
                  <View style={styles.ctaPillInnerShade} />
                  <Ionicons name="scan-outline" size={18} color="#244E34" />
                  <Text style={styles.ctaPillText}>Hemen Tara</Text>
                </LinearGradient>
              </Pressable>
              <Text style={styles.featuredHint}>
                QR kodu okutmadan menuye erisemezsiniz
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.featuredSecondaryAction,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                onPress={() => navigation.navigate('QRScanner')}
                android_ripple={androidRipple}
              >
                <Text style={styles.featuredSecondaryActionText}>QR yok mu?</Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="rgba(255,255,255,0.88)"
                />
              </Pressable>
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
              <Text style={styles.campaignBadgeText}>Mobil Uygulamaya Ozel</Text>
            </View>
          </View>
          <Text style={styles.campaignTitle}>Ilk siparise %20 indirim</Text>
          <Text style={styles.campaignDesc}>
            QR ile baglandiktan sonra uygulamaya ozel firsatlari kesfedin.
          </Text>
          <View style={styles.campaignCta}>
            <Text style={styles.campaignCtaText}>Detaylari Gor</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={menuColors.primaryDark}
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
          <Ionicons name="person-outline" size={18} color={OBSIDIAN} />
          <View style={styles.qrLinkTextWrap}>
            <Text style={styles.qrLinkText}>Profil ve Gecmis Siparisler</Text>
            <Text style={styles.qrLinkSubtext}>Hesap ayarlari ve siparis takibi</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={menuColors.textSecondary}
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: menuColors.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 120,
  },
  profileCard: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: menuColors.card,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  profileCardPress: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    width: '100%',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: menuColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTextCol: {
    marginLeft: 10,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  profileGreeting: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: OBSIDIAN,
    lineHeight: 22,
  },
  profileMeta: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textSecondary,
    marginTop: 0,
    lineHeight: 18,
  },
  tableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: menuColors.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: menuColors.border,
  },
  tableChipText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 14,
    color: menuColors.text,
    flex: 1,
  },
  tableLink: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: menuColors.primary,
  },
  tableDot: { color: menuColors.textMutedLight },
  tableMuted: { fontSize: 14, color: menuColors.textSecondary },
  featuredOuter: {
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  featuredCard: {
    minHeight: 318,
  },
  featuredCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  featuredTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 36,
    color: menuColors.white,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  featuredDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 15,
    color: 'rgba(255,255,255,0.96)',
    lineHeight: 22,
    marginBottom: 22,
    textAlign: 'center',
    maxWidth: 260,
  },
  featuredHint: {
    marginTop: 12,
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.86)',
    textAlign: 'center',
  },
  featuredSecondaryAction: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  featuredSecondaryActionText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  featuredQrStack: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  featuredQrPulseRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  featuredQrIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.44)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 7,
  },
  featuredQrInnerShade: {
    position: 'absolute',
    inset: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(21, 44, 31, 0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  featuredQrScanLine: {
    position: 'absolute',
    width: 68,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(245,248,234,0.9)',
    shadowColor: '#F5F8EA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaPill: {
    alignSelf: 'stretch',
    borderRadius: 28,
    overflow: 'hidden',
    maxWidth: 280,
    width: '100%',
    shadowColor: '#1A3324',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaPillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  ctaPillInnerShade: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 1,
    top: 9,
    borderRadius: 24,
    backgroundColor: 'rgba(36, 78, 52, 0.08)',
  },
  ctaPillText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: '#244E34',
  },
  campaignCard: {
    marginBottom: 14,
    backgroundColor: '#F4F8F5',
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.12)',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  campaignTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  campaignBadge: {
    backgroundColor: 'rgba(46,125,50,0.12)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  campaignBadgeText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 12,
    color: menuColors.primaryDark,
  },
  campaignTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 18,
    color: OBSIDIAN,
    marginBottom: 3,
  },
  campaignDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: menuColors.textSecondary,
    marginBottom: 10,
  },
  campaignCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.14)',
  },
  campaignCtaText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: menuColors.primaryDark,
  },
  qrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: 16,
    backgroundColor: menuColors.card,
  },
  qrLinkTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  qrLinkText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: OBSIDIAN,
  },
  qrLinkSubtext: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: menuColors.textSecondary,
    marginTop: 2,
  },
});
