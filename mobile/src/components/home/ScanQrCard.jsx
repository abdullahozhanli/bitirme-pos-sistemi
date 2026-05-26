import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { homeFonts } from '../../constants/homeTheme';
import IconBadge from './IconBadge';
import { homeCardTheme, profileCardStyle, qrGradient } from './homeTheme';

const WELCOME_TITLE = "Self Kasa'ya hoş geldiniz!";

export default function ScanQrCard({ onScanPress }) {
  return (
    <View style={styles.outer}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <IconBadge name="scan-outline" />
          <Text style={styles.topLabel}>QR ile bağlan</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.qrFrame}>
            <LottieView
              source={require('../../görsel/qr-scan.json')}
              autoPlay
              loop
              style={styles.lottie}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>{WELCOME_TITLE}</Text>

          <Pressable
            style={({ pressed }) => [styles.ctaWrap, pressed && styles.ctaPressed]}
            onPress={onScanPress}
            android_ripple={{ color: 'rgba(255,255,255,0.22)', foreground: true }}
          >
            <LinearGradient
              colors={qrGradient}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="scan-outline" size={19} color="#FFFFFF" />
              <Text style={styles.ctaText}>QR Kodu Tara</Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.hint}>
            Menüye erişmek için masadaki kodu okutmanız gerekir
          </Text>
        </View>
      </View>
    </View>
  );
}

const cardShadow = {
  shadowColor: profileCardStyle.shadowColor,
  shadowOffset: profileCardStyle.shadowOffset,
  shadowOpacity: profileCardStyle.shadowOpacity,
  shadowRadius: profileCardStyle.shadowRadius,
  elevation: profileCardStyle.elevation,
};

const styles = StyleSheet.create({
  outer: {
    borderRadius: 18,
    marginBottom: 16,
    ...cardShadow,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: homeCardTheme.border,
    backgroundColor: homeCardTheme.cardBg,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  topLabel: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: homeCardTheme.textPrimary,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 22,
  },
  qrFrame: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 16,
    backgroundColor: homeCardTheme.iconCircleBg,
    overflow: 'hidden',
  },
  lottie: {
    width: 100,
    height: 100,
  },
  title: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 21,
    lineHeight: 27,
    color: homeCardTheme.textPrimary,
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.25,
  },
  ctaWrap: {
    alignSelf: 'stretch',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2F9A4A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 26,
  },
  ctaText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  hint: {
    marginTop: 14,
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: homeCardTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
});
