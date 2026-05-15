import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { menuColors, pressScale } from '../constants/homeTheme';

export const SCREEN_BACK_HIT_SIZE = 40;

/**
 * İnce çizgili geri ok (Feather) — Ionicons + kutu yerine daha zarif.
 */
export default function ScreenBackButton({
  onPress,
  color = '#1A1A1A',
  size = 24,
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 14 }}
      style={({ pressed }) => [styles.hit, pressScale(pressed)]}
      accessibilityRole="button"
      accessibilityLabel="Geri"
    >
      <Feather name="chevron-left" size={size} color={color} />
    </Pressable>
  );
}

export function ScreenBackPlaceholder() {
  return <View style={styles.hit} />;
}

const styles = StyleSheet.create({
  hit: {
    width: SCREEN_BACK_HIT_SIZE,
    height: SCREEN_BACK_HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -2,
  },
});
