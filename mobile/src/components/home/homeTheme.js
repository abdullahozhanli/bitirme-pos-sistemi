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

/** Bağlı masa kartı — mockup paleti */
export const connectedCardTheme = {
  cardBg: '#FFFFFF',
  border: '#E8E8E8',
  divider: '#EEEEEE',
  /** İkon önde — arka daire çok silik */
  iconCircleBg: '#F4F9F6',
  /** Menüye Git butonu ile aynı yeşil */
  iconColor: '#1F6B38',
  labelGreen: '#1F6B38',
  checkGreen: '#4CAF50',
  textPrimary: '#111827',
  textMuted: '#6B7280',
  removePillBg: '#F3F4F6',
  removeIcon: '#6B7280',
  removeText: '#4B5563',
  primaryBtnBg: '#1F6B38',
  primaryBtnPressed: '#1A5C30',
  secondaryBorder: '#1F2937',
};
