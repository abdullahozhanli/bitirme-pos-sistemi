import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { homeFonts, pressScale } from '../../constants/homeTheme';
import ProfileAvatar from '../ProfileAvatar';

const PALETTE = {
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  softGreen: '#ECFDF3',
};

function namePartsFromUser(user) {
  if (!user) return { first: 'Misafir', last: '' };
  const apiLast = String(user.surname ?? user.lastName ?? user.soyad ?? '').trim();
  const rawName = String(user.name ?? '').trim();
  if (apiLast && rawName) return { first: rawName, last: apiLast };
  if (rawName) {
    const i = rawName.indexOf(' ');
    if (i === -1) return { first: rawName, last: '' };
    return { first: rawName.slice(0, i).trim(), last: rawName.slice(i + 1).trim() || '' };
  }
  if (user.email) return { first: user.email.split('@')[0], last: '' };
  return { first: 'Misafir', last: '' };
}

export default function ProfileCard({ user, points, campaignCount, onPress }) {
  const { first: firstName, last: lastName } = namePartsFromUser(user);

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.press, pressScale(pressed)]}
        onPress={onPress}
      >
        <ProfileAvatar
          avatarUrl={user?.avatarUrl}
          size={40}
          borderRadius={12}
          variant="compact"
          placeholderIconColor={PALETTE.textPrimary}
          placeholderBackgroundColor={PALETTE.softGreen}
          style={styles.avatar}
        />
        <View style={styles.textCol}>
          <Text style={styles.nameLine} numberOfLines={1} ellipsizeMode="tail">
            <Text style={styles.firstName}>{firstName}</Text>
            {lastName ? <Text style={styles.lastName}>{` ${lastName}`}</Text> : null}
          </Text>
          <Text style={styles.meta}>
            <Text>Parapuan </Text>
            <Text>{points}</Text>
            <Text style={styles.metaMuted}> · {campaignCount} kampanya</Text>
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={PALETTE.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  press: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  textCol: {
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
  },
  nameLine: {
    fontSize: 16,
    lineHeight: 20,
  },
  firstName: {
    fontFamily: homeFonts.sansSemi,
    color: PALETTE.textPrimary,
  },
  lastName: {
    fontFamily: homeFonts.sansSemi,
    color: PALETTE.textPrimary,
  },
  meta: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: PALETTE.textSecondary,
    marginTop: 3,
  },
  metaMuted: {
    color: PALETTE.textSecondary,
  },
});
