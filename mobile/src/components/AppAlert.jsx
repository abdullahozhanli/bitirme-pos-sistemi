import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { homeFonts, menuColors, pressScale, uiShadow } from '../constants/homeTheme';

const VARIANTS = {
  info: {
    icon: 'information-circle',
    iconColor: '#2E7D32',
    iconBg: '#E8F5E9',
    iconBorder: 'rgba(63, 163, 77, 0.25)',
  },
  warning: {
    icon: 'alert-circle',
    iconColor: '#B45309',
    iconBg: '#FEF3C7',
    iconBorder: 'rgba(217, 119, 6, 0.25)',
  },
  error: {
    icon: 'close-circle',
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
    iconBorder: 'rgba(220, 38, 38, 0.2)',
  },
  success: {
    icon: 'checkmark-circle',
    iconColor: '#2E7D32',
    iconBg: '#E8F5E9',
    iconBorder: 'rgba(63, 163, 77, 0.25)',
  },
};

/**
 * @param {{
 *   visible: boolean;
 *   variant?: 'info' | 'warning' | 'error' | 'success';
 *   title: string;
 *   message?: string;
 *   buttons?: Array<{ text: string; primary?: boolean; onPress?: () => void }>;
 *   onRequestClose?: () => void;
 *   onDismiss?: () => void;
 * }} props
 */
export default function AppAlert({
  visible,
  variant = 'info',
  title,
  message,
  buttons = [{ text: 'Tamam', primary: true }],
  onRequestClose,
  onDismiss,
}) {
  const theme = VARIANTS[variant] || VARIANTS.info;
  const close = onRequestClose ?? (() => {});
  const dismiss = () => {
    onDismiss?.();
    close();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <Pressable style={styles.overlay} onPress={dismiss} accessibilityViewIsModal>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.iconBg, borderColor: theme.iconBorder },
            ]}
          >
            <Ionicons name={theme.icon} size={34} color={theme.iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : (
            <View style={styles.messageSpacer} />
          )}
          <View style={[styles.actions, buttons.length > 1 && styles.actionsRow]}>
            {buttons.map((btn, index) => {
              const isPrimary = buttons.length === 1 ? true : !!btn.primary;
              if (isPrimary) {
                return (
                  <Pressable
                    key={`${btn.text}-${index}`}
                    style={({ pressed }) => [
                      styles.primaryWrap,
                      buttons.length > 1 && styles.actionHalf,
                      pressScale(pressed),
                    ]}
                    onPress={() => {
                      btn.onPress?.();
                      close();
                    }}
                  >
                    <LinearGradient
                      colors={['#7FD67F', '#52C060', '#3FA34D']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.primaryGradient}
                    >
                      <Text style={styles.primaryText}>{btn.text}</Text>
                    </LinearGradient>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={`${btn.text}-${index}`}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    buttons.length > 1 && styles.actionHalf,
                    pressed && styles.secondaryBtnPressed,
                  ]}
                  onPress={() => {
                    btn.onPress?.();
                    close();
                  }}
                >
                  <Text style={styles.secondaryText}>{btn.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    ...uiShadow.lift,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: homeFonts.sansBold,
    fontSize: 19,
    color: menuColors.textBold,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  message: {
    fontFamily: homeFonts.sans,
    fontSize: 14,
    color: menuColors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  messageSpacer: {
    height: 12,
  },
  actions: {
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionHalf: {
    flex: 1,
  },
  primaryWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryGradient: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: menuColors.border,
    backgroundColor: menuColors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryBtnPressed: {
    opacity: 0.88,
  },
  secondaryText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: menuColors.text,
  },
});
