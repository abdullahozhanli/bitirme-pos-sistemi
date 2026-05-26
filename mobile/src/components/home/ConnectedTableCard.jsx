import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { homeFonts, androidRipple } from '../../constants/homeTheme';
import { formatConnectedTime } from '../../utils/tableSessionCore';
import IconBadge from './IconBadge';
import { homeCardTheme, menuGoBtn, profileCardStyle } from './homeTheme';

function tableDisplayName(session) {
  if (session?.tableName) return session.tableName;
  if (session?.tableNumber) return `Masa ${session.tableNumber}`;
  return '—';
}

export default function ConnectedTableCard({
  session,
  onRemove,
  onGoMenu,
  onScanAgain,
}) {
  const tableName = tableDisplayName(session);
  const restaurantName = session?.restaurantName || 'Self Kasa Cafe';
  const connectedLabel = formatConnectedTime(session?.connectedAt);

  return (
    <View style={styles.outer}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <IconBadge name="grid-outline" />

          <View style={styles.headerTextCol}>
            <Text style={styles.headerLabel}>Bağlı Masa</Text>
            <Text style={styles.tableTitle}>{tableName}</Text>
            <View style={styles.linkedRow}>
              <View style={styles.statusDot} />
              <Text style={styles.linkedText}>QR ile bağlandı</Text>
            </View>
          </View>

          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={({ pressed }) => [styles.removePill, pressed && styles.pressed]}
            android_ripple={androidRipple}
          >
            <Ionicons name="close-outline" size={14} color={homeCardTheme.removeText} />
            <Text style={styles.removePillText}>Kaldır</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.restaurantRow}>
          <IconBadge name="storefront-outline" />
          <View style={styles.restaurantTextCol}>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            <View style={styles.timeRow}>
              <Ionicons
                name="time-outline"
                size={13}
                color={homeCardTheme.textSecondary}
              />
              <Text style={styles.timeText}>Son bağlantı: {connectedLabel}</Text>
              <Text style={styles.timeDot}>·</Text>
              <Text style={styles.timeText}>1 saat geçerli</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={onGoMenu}
            android_ripple={{ color: 'rgba(255,255,255,0.15)', foreground: true }}
          >
            <Text style={styles.primaryBtnText}>Menüye Git</Text>
            <Ionicons name="chevron-forward" size={16} color={menuGoBtn.icon} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={onScanAgain}
            android_ripple={androidRipple}
          >
            <IconBadge name="scan-outline" size={32} iconSize={18} />
            <Text style={styles.secondaryBtnText}>Farklı Masa / QR Okut</Text>
            <Ionicons name="chevron-forward" size={16} color={homeCardTheme.textSecondary} />
          </Pressable>
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
    marginBottom: 16,
    borderRadius: 18,
    ...cardShadow,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: homeCardTheme.border,
    backgroundColor: homeCardTheme.cardBg,
    overflow: 'hidden',
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  headerLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: homeCardTheme.textSecondary,
    marginBottom: 2,
  },
  tableTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 21,
    color: homeCardTheme.textPrimary,
    letterSpacing: -0.35,
    lineHeight: 25,
    marginBottom: 5,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: homeCardTheme.statusDot,
  },
  linkedText: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: homeCardTheme.textSecondary,
  },
  removePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    flexShrink: 0,
  },
  removePillText: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 11,
    color: homeCardTheme.removeText,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: homeCardTheme.border,
    marginHorizontal: 14,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  restaurantTextCol: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: homeCardTheme.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.15,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  timeText: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: homeCardTheme.textSecondary,
  },
  timeDot: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: homeCardTheme.textMuted,
  },
  actions: {
    paddingHorizontal: 14,
    gap: 9,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: menuGoBtn.minHeight,
    paddingHorizontal: 16,
    borderRadius: menuGoBtn.borderRadius,
    backgroundColor: menuGoBtn.bg,
    shadowColor: profileCardStyle.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryBtnPressed: {
    backgroundColor: menuGoBtn.bgPressed,
    opacity: 0.96,
  },
  primaryBtnText: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuGoBtn.text,
    textAlign: 'center',
    marginRight: 16,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: homeCardTheme.cardBg,
    borderWidth: 1,
    borderColor: homeCardTheme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: homeCardTheme.textPrimary,
  },
  pressed: {
    opacity: 0.9,
  },
});
