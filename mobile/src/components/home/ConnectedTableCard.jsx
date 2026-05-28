import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { homeFonts, androidRipple } from '../../constants/homeTheme';
import { formatConnectedTime } from '../../utils/tableSessionCore';
import { connectedCardTheme, profileCardStyle } from './homeTheme';

/** MaterialCommunityIcons — yemek / masa / QR için daha net set */
const ICON = {
  table: 'silverware-fork-knife',
  store: 'store-outline',
  menu: 'room-service-outline',
  qr: 'qrcode-scan',
};

function tableDisplayName(session) {
  if (session?.tableName) return session.tableName;
  if (session?.tableNumber) return `Masa ${session.tableNumber}`;
  return '—';
}

function IconCircle({ name, size = 44, iconSize = 22 }) {
  return (
    <View
      style={[
        styles.iconCircle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <MaterialCommunityIcons
        name={name}
        size={iconSize}
        color={connectedCardTheme.iconColor}
      />
    </View>
  );
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
          <IconCircle name={ICON.table} />

          <View style={styles.headerTextCol}>
            <Text style={styles.headerLabel}>Bağlı Masa</Text>
            <Text style={styles.tableTitle}>{tableName}</Text>
          </View>

          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={({ pressed }) => [styles.removePill, pressed && styles.pressed]}
            android_ripple={androidRipple}
          >
            <Ionicons
              name="trash-outline"
              size={13}
              color={connectedCardTheme.iconColor}
            />
            <Text style={styles.removePillText}>Bağlantıyı kaldır</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.restaurantRow}>
          <IconCircle name={ICON.store} size={40} iconSize={20} />
          <View style={styles.restaurantTextCol}>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            <View style={styles.timeRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={connectedCardTheme.textMuted}
              />
              <Text style={styles.timeText}>Son bağlantı: {connectedLabel}</Text>
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
            <MaterialCommunityIcons name={ICON.menu} size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Menüye Git</Text>
            <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={onScanAgain}
            android_ripple={androidRipple}
          >
            <MaterialCommunityIcons
              name={ICON.qr}
              size={22}
              color={connectedCardTheme.iconColor}
            />
            <Text style={styles.secondaryBtnText}>Farklı Masa / QR Okut</Text>
            <Ionicons
              name="chevron-forward"
              size={17}
              color={connectedCardTheme.iconColor}
            />
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
    borderRadius: 20,
    ...cardShadow,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: connectedCardTheme.border,
    backgroundColor: connectedCardTheme.cardBg,
    overflow: 'hidden',
    paddingBottom: 14,
  },
  iconCircle: {
    backgroundColor: connectedCardTheme.iconCircleBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    paddingTop: 2,
  },
  headerLabel: {
    fontFamily: homeFonts.sansMedium,
    fontSize: 12,
    color: connectedCardTheme.labelGreen,
    marginBottom: 2,
  },
  tableTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 22,
    color: connectedCardTheme.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 26,
    marginBottom: 4,
  },
  removePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: connectedCardTheme.removePillBg,
    flexShrink: 0,
    maxWidth: 118,
  },
  removePillText: {
    fontFamily: homeFonts.sans,
    fontSize: 10,
    color: connectedCardTheme.removeText,
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: connectedCardTheme.divider,
    marginHorizontal: 14,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  restaurantTextCol: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: connectedCardTheme.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.15,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontFamily: homeFonts.sans,
    fontSize: 12,
    color: connectedCardTheme.textMuted,
  },
  actions: {
    paddingHorizontal: 14,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: connectedCardTheme.primaryBtnBg,
  },
  primaryBtnPressed: {
    backgroundColor: connectedCardTheme.primaryBtnPressed,
    opacity: 0.96,
  },
  primaryBtnText: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: connectedCardTheme.cardBg,
    borderWidth: 1.5,
    borderColor: connectedCardTheme.secondaryBorder,
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: connectedCardTheme.textPrimary,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
