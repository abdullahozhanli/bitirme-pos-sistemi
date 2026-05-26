import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileCardStyle } from './homeTheme';

/**
 * ProfileCard / ProfileAvatar compact ile aynı ikon kutusu
 */
export default function IconBadge({
  name,
  size = profileCardStyle.iconCircleSize,
  iconSize = Math.max(20, Math.round(size * 0.55)),
  color = profileCardStyle.iconColor,
  style,
}) {
  const radius =
    size === profileCardStyle.iconCircleSize
      ? profileCardStyle.iconCircleRadius
      : Math.round(size * 0.3);

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: profileCardStyle.iconCircleBg,
        },
        style,
      ]}
    >
      <Ionicons name={name} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
});
