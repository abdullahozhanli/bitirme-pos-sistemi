/**
 * Ana sayfa kartları — ProfileCard paleti ile birebir
 * @see mobile/src/components/home/ProfileCard.jsx PALETTE
 * @see mobile/src/components/ProfileAvatar.jsx compact placeholder
 */
import { menuColors } from '../../constants/homeTheme';

/** ProfileCard.jsx ile aynı */
export const profileCardStyle = {
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  softGreen: '#ECFDF3',
  iconCircleBg: '#ECFDF3',
  iconColor: '#111827',
  iconCircleSize: 40,
  iconCircleRadius: 12,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 16,
  elevation: 2,
};

export const homeCardTheme = {
  ...profileCardStyle,
  primary: menuColors.primary,
  primaryDark: menuColors.primaryDark,
  primaryLight: menuColors.primaryLight,
  titleGreen: '#1F6B38',
  priceGreen: '#3A7F3D',
  cardBg: profileCardStyle.cardBg,
  cardSoft: profileCardStyle.softGreen,
  pageBg: menuColors.bg,
  border: profileCardStyle.border,
  borderSoft: profileCardStyle.border,
  textPrimary: profileCardStyle.textPrimary,
  textBody: '#374151',
  textSecondary: profileCardStyle.textSecondary,
  textMuted: menuColors.textMuted,
  statusDot: '#5CB348',
  removeText: profileCardStyle.textSecondary,
  badgeBg: profileCardStyle.softGreen,
  badgeText: menuColors.primaryDark,
  white: menuColors.white,
};

/** QR kartı CTA — belirgin gradient */
export const qrGradient = ['#2F8F39', '#4CAF50', '#67C96B'];

/** Bağlı masa «Menüye Git» — gradient ile outline arası */
export const menuGoBtn = {
  bg: menuColors.primary,
  bgPressed: '#389647',
  text: '#FFFFFF',
  icon: '#FFFFFF',
  borderRadius: 14,
  minHeight: 44,
};

export const scanCardGradient = [profileCardStyle.cardBg, profileCardStyle.cardBg];
