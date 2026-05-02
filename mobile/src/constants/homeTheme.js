/** Eski lacivert/altın palet */
export const homeColors = {
  bg: '#F7F8FA',
  navy: '#1A1F2B',
  gold: '#D4AF37',
  goldDark: '#B8941F',
  white: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  textMutedLight: '#9CA3AF',
  border: '#E5E7EB',
  cardShadow: 'rgba(26, 31, 43, 0.08)',
};

/**
 * Premium food UI — soft yeşil, ferah layout
 * Primary gradient: 135deg #3FA34D → #2E7D32
 */
export const menuColors = {
  primary: '#3FA34D',
  primaryDark: '#2E7D32',
  primaryLight: '#5CBF6A',
  bg: '#F5F7F6',
  bgSoft: '#EEF1F0',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textBold: '#1A1A1A',
  textMuted: '#6B7280',
  textSecondary: '#6B7280',
  textMutedLight: '#9CA3AF',
  white: '#FFFFFF',
  pillMuted: '#EEF1F0',
  border: 'rgba(26, 26, 26, 0.08)',
};

/** Soft UI gölgeler */
export const uiShadow = {
  card: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 6,
  },
  lift: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 10,
  },
  nav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 18,
  },
  iconPill: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const homeFonts = {
  serifBold: 'PlayfairDisplay_700Bold',
  serifSemi: 'PlayfairDisplay_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
};

export const pressScale = (pressed) => ({
  transform: [{ scale: pressed ? 0.96 : 1 }],
});

export const pressLift = (pressed) => ({
  transform: [{ translateY: pressed ? -2 : 0 }, { scale: pressed ? 0.98 : 1 }],
});

export const androidRipple = {
  color: 'rgba(63, 163, 77, 0.18)',
  foreground: true,
};
