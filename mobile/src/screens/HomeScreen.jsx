import { useCallback } from 'react';
import {
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

/** Ana ekran — soft shadow */
const homeShadowCard = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 16,
  elevation: 2,
};
const DEFAULT_CAMPAIGNS = 3;
const GRADIENT = ['#3FA34D', '#2E7D32'];
const QR_CARD_GRADIENT = ['#FFFFFF', '#EFF6FF'];
const BUTTON_GRADIENT = ['#F7F8F2', '#E8ECD9'];
const OBSIDIAN = '#111827';
/** Yeni renk paleti */
const PALETTE = {
  pageBg: '#F8F7F4',
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

  const name = displayName(user);
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
        <View style={[styles.profileCard, homeShadowCard]}>
          <Pressable
            style={({ pressed }) => [
              styles.profileCardPress,
              pressScale(pressed),
            ]}
            onPress={() => navigation.navigate('Profile')}
            android_ripple={androidRipple}
          >
            <View style={styles.avatar}>
              <Ionicons
                name="person-outline"
                size={22}
                color={PALETTE.success}
              />
            </View>
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
              <View style={styles.featuredQrStack}>
                <View style={styles.featuredQrIconWrap}>
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={48}
                    color={PALETTE.success}
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
                  pressed && styles.ctaPillPressed,
                ]}
                onPress={() => navigation.navigate('QRScanner')}
                android_ripple={{ color: 'rgba(255,255,255,0.18)', foreground: true }}
              >
                <Ionicons name="scan-outline" size={18} color={PALETTE.btnPrimaryText} />
                <Text style={styles.ctaPillText}>Hemen Tara</Text>
              </Pressable>
              <Text style={styles.featuredHint}>
                QR kodu okutmadan menüye erişemezsiniz
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
          <Ionicons name="person-outline" size={18} color={PALETTE.textPrimary} />
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
  profileCard: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: PALETTE.cardBg,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PALETTE.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  profileGreeting: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: PALETTE.textPrimary,
    lineHeight: 22,
  },
  profileMeta: {
    fontFamily: homeFonts.sans,
    fontSize: 13,
    color: PALETTE.textSecondary,
    marginTop: 2,
    lineHeight: 18,
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
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.cardBg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  featuredCard: {
    borderRadius: 28,
  },
  featuredCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 22,
  },
  featuredTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 30,
    color: PALETTE.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  featuredDesc: {
    fontFamily: homeFonts.sans,
    fontSize: 15,
    color: PALETTE.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
  featuredHint: {
    marginTop: 16,
    fontFamily: homeFonts.sansMedium,
    fontSize: 13,
    color: PALETTE.textSecondary,
    textAlign: 'center',
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
  featuredQrStack: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  featuredQrIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: PALETTE.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 999,
    paddingHorizontal: 24,
    backgroundColor: PALETTE.btnPrimary,
    width: '90%',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaPillPressed: {
    backgroundColor: '#1F2937',
  },
  ctaPillText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 17,
    color: PALETTE.btnPrimaryText,
    letterSpacing: 0.2,
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
