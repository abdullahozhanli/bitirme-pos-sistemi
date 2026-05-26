import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const PROFILE_GRADIENT = ['#3FA34D', '#66BB6A'];

/**
 * Profil görseli: sunucudaki foto veya varsayılan kişi ikonu (logo değil).
 */
export default function ProfileAvatar({
  avatarUrl,
  size = 40,
  borderRadius,
  style,
  imageStyle,
  resizeMode = 'cover',
  /** compact: ana sayfa kartı | profile: profil ekranı yeşil gradient */
  variant = 'compact',
  placeholderIconColor = '#1A1A1A',
  placeholderBackgroundColor = '#E8F5E9',
}) {
  const resolved = resolveMediaUrl(avatarUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  const radius = borderRadius ?? Math.round(size * 0.3);
  const showRemote = Boolean(resolved) && !failed;
  const iconSize = variant === 'profile' ? 40 : Math.max(20, Math.round(size * 0.55));

  const placeholder =
    variant === 'profile' ? (
      <LinearGradient
        colors={PROFILE_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, styles.centered, { width: size, height: size }]}
      >
        <Ionicons name="person-circle-outline" size={iconSize} color="#FFFFFF" />
      </LinearGradient>
    ) : (
      <View
        style={[
          styles.fill,
          styles.centered,
          {
            width: size,
            height: size,
            backgroundColor: placeholderBackgroundColor,
          },
        ]}
      >
        <Ionicons
          name="person-circle-outline"
          size={iconSize}
          color={placeholderIconColor}
        />
      </View>
    );

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {showRemote ? (
        <Image
          source={{ uri: resolved }}
          style={[styles.fill, { width: size, height: size }, imageStyle]}
          resizeMode={resizeMode}
          onError={() => setFailed(true)}
        />
      ) : (
        placeholder
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
