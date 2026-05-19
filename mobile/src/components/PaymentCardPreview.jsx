import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { homeFonts } from '../constants/homeTheme';

const PAN_PLACEHOLDER = '0000 0000 0000 0000';
const NAME_PLACEHOLDER = 'AD SOYAD';
const EXPIRY_PLACEHOLDER = 'AA/YY';
const CVV_PLACEHOLDER = '•••';
const CARD_MIN_HEIGHT = 158;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function digitsOnly(value, maxLen) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, maxLen);
}

export function isCardFrontValid({ holder, number, expiry }) {
  const holderOk = String(holder || '').trim().length >= 2;
  const numOk = digitsOnly(number, 19).length >= 16;
  const exp = String(expiry || '').trim();
  if (!/^\d{2}\/\d{2}$/.test(exp)) return false;
  const [mm, yy] = exp.split('/').map((x) => Number(x));
  return holderOk && numOk && mm >= 1 && mm <= 12 && yy >= 0 && yy <= 99;
}

function runFlipAnimation() {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      280,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity
    )
  );
}

function CardShell({ children }) {
  return (
    <View style={styles.cardFrame}>
      <View style={styles.cardInner}>
        <View style={styles.cardContent}>{children}</View>
      </View>
    </View>
  );
}

export default function PaymentCardPreview({
  holder = '',
  number = '',
  expiry = '',
  cvv = '',
  onChangeHolder,
  onChangeNumber,
  onChangeExpiry,
  onChangeCvv,
  editable = true,
}) {
  const [focused, setFocused] = useState(null);
  const [isBack, setIsBack] = useState(false);
  const cvvRef = useRef(null);
  const numberRef = useRef(null);
  const nameRef = useRef(null);
  const expiryRef = useRef(null);
  const blockAutoBackRef = useRef(false);

  const frontReady = isCardFrontValid({ holder, number, expiry });
  const lastFour = digitsOnly(number, 16).slice(-4) || '••••';

  function fieldStyle(key) {
    return [styles.fieldInput, focused === key && styles.fieldInputFocused];
  }

  const goToBack = useCallback(() => {
    if (!isCardFrontValid({ holder, number, expiry })) return false;
    if (isBack) return true;

    runFlipAnimation();
    setIsBack(true);
    setFocused(null);
    setTimeout(() => cvvRef.current?.focus(), 320);
    return true;
  }, [holder, number, expiry, isBack]);

  const resetToFront = useCallback(() => {
    runFlipAnimation();
    setIsBack(false);
    setFocused(null);
  }, []);

  const goToFront = useCallback(() => {
    blockAutoBackRef.current = true;
    resetToFront();
  }, [resetToFront]);

  useEffect(() => {
    const frontValid = isCardFrontValid({ holder, number, expiry });
    if (!frontValid) {
      blockAutoBackRef.current = false;
      if (isBack) resetToFront();
      return;
    }
    if (!isBack && !blockAutoBackRef.current) {
      goToBack();
    }
  }, [holder, number, expiry, isBack, goToBack, resetToFront]);

  const cardTopRow = (
    <View style={styles.topRow}>
      <LinearGradient
        colors={['#d4af37', '#f5e6a8', '#b8962e', '#e8d48b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chip}
      >
        <View style={styles.chipLine} />
        <View style={[styles.chipLine, styles.chipLineMid]} />
      </LinearGradient>
      <Ionicons
        name="wifi"
        size={22}
        color="#6B7280"
        style={styles.contactless}
      />
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.cardSurround}>
        <View style={styles.cardStage}>
        {!isBack ? (
          <CardShell key="front">
            <Text style={styles.creditLabel}>KREDİ KARTI</Text>
            {cardTopRow}

            <Text style={styles.fieldLabel}>KART NUMARASI</Text>
            <TextInput
              ref={numberRef}
              style={[styles.panInput, focused === 'number' && styles.fieldInputFocused]}
              value={number}
              onChangeText={onChangeNumber}
              placeholder={PAN_PLACEHOLDER}
              placeholderTextColor="rgba(0,0,0,0.28)"
              keyboardType="number-pad"
              maxLength={19}
              editable={editable}
              onFocus={() => setFocused('number')}
              onBlur={() => setFocused(null)}
              returnKeyType="next"
              onSubmitEditing={() => nameRef.current?.focus()}
              selectionColor="#3FA34D"
            />

            <View style={styles.footer}>
              <View style={styles.footerCol}>
                <Text style={styles.fieldLabel}>KART SAHİBİ</Text>
                <TextInput
                  ref={nameRef}
                  style={fieldStyle('holder')}
                  value={holder}
                  onChangeText={(t) => onChangeHolder?.(t.toUpperCase())}
                  placeholder={NAME_PLACEHOLDER}
                  placeholderTextColor="rgba(0,0,0,0.28)"
                  autoCapitalize="characters"
                  editable={editable}
                  onFocus={() => setFocused('holder')}
                  onBlur={() => setFocused(null)}
                  returnKeyType="next"
                  onSubmitEditing={() => expiryRef.current?.focus()}
                  selectionColor="#3FA34D"
                />
              </View>
              <View style={[styles.footerCol, styles.footerColNarrow]}>
                <View style={styles.expiryRow}>
                  <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                  <Text style={styles.fieldLabel}>SON KULLANMA</Text>
                </View>
                <TextInput
                  ref={expiryRef}
                  style={fieldStyle('expiry')}
                  value={expiry}
                  onChangeText={onChangeExpiry}
                  placeholder={EXPIRY_PLACEHOLDER}
                  placeholderTextColor="rgba(0,0,0,0.28)"
                  keyboardType="number-pad"
                  maxLength={5}
                  editable={editable}
                  onFocus={() => setFocused('expiry')}
                  onBlur={() => setFocused(null)}
                  returnKeyType="done"
                  onSubmitEditing={() => goToBack()}
                  selectionColor="#3FA34D"
                />
              </View>
            </View>
          </CardShell>
        ) : (
          <CardShell key="back">
            <Text style={styles.creditLabel}>KREDİ KARTI</Text>

            <View style={styles.topRow}>
              <View style={styles.stripSlot}>
                <LinearGradient
                  colors={['#d4af37', '#f5e6a8', '#b8962e', '#e8d48b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.strip}
                />
              </View>
              <Ionicons
                name="wifi"
                size={22}
                color="#D1D5DB"
                style={styles.contactless}
              />
            </View>

            <Text style={styles.fieldLabel}>GÜVENLİK KODU</Text>
            <TextInput
              ref={cvvRef}
              style={[styles.panInput, focused === 'cvv' && styles.fieldInputFocused]}
              value={cvv}
              onChangeText={onChangeCvv}
              placeholder={CVV_PLACEHOLDER}
              placeholderTextColor="rgba(0,0,0,0.28)"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              editable={editable}
              autoFocus
              onFocus={() => setFocused('cvv')}
              onBlur={() => setFocused(null)}
              returnKeyType="done"
              selectionColor="#3FA34D"
            />

            <View style={[styles.footer, styles.footerBack]}>
              <View style={styles.footerCol}>
                <Text style={styles.fieldLabel}>KART NO</Text>
                <Text style={styles.fieldReadonly}>•••• {lastFour}</Text>
              </View>
            </View>
          </CardShell>
        )}
        </View>
      </View>

      {isBack ? (
        <Pressable
          style={({ pressed }) => [styles.flipCta, pressed && { opacity: 0.9 }]}
          onPress={goToFront}
        >
          <Ionicons name="chevron-back-circle" size={18} color="#3FA34D" />
          <Text style={styles.flipCtaText}>Ön yüze dön</Text>
        </Pressable>
      ) : null}

      <Text style={styles.tapHint}>
        {isBack
          ? 'Güvenlik kodunu girdikten sonra Kartı onayla'
          : frontReady
            ? 'Arka yüze otomatik geçiliyor…'
            : '16 haneli numara, isim ve son kullanma (AA/YY) gerekli'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  cardSurround: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#DDDDDD',
  },
  cardStage: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 2,
    minHeight: CARD_MIN_HEIGHT,
  },
  flipCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(63, 163, 77, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(63, 163, 77, 0.35)',
  },
  flipCtaText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: '#3FA34D',
  },
  cardFrame: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  cardInner: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardContent: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    minHeight: CARD_MIN_HEIGHT,
    justifyContent: 'space-between',
  },
  creditLabel: {
    alignSelf: 'flex-end',
    fontFamily: homeFonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#6B7280',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    marginBottom: 0,
    minHeight: 28,
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    padding: 4,
    justifyContent: 'center',
    gap: 4,
  },
  chipLine: {
    height: 3,
    borderRadius: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    width: '88%',
  },
  chipLineMid: {
    width: '65%',
    alignSelf: 'center',
  },
  contactless: {
    transform: [{ rotate: '90deg' }],
  },
  stripSlot: {
    flex: 1,
    height: 28,
    marginRight: 12,
    justifyContent: 'center',
  },
  strip: {
    height: 28,
    borderRadius: 6,
    width: '100%',
  },
  fieldLabel: {
    fontFamily: homeFonts.sans,
    fontSize: 9,
    letterSpacing: 0.6,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  panInput: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 19,
    letterSpacing: 1.2,
    color: '#111827',
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    paddingHorizontal: 0,
    marginBottom: 4,
    backgroundColor: 'transparent',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  fieldInput: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#111827',
    letterSpacing: 0.3,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  fieldReadonly: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 13,
    color: '#111827',
    letterSpacing: 0.3,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  fieldInputFocused: {
    borderBottomColor: '#3FA34D',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  footerCol: {
    flex: 1,
    minWidth: 0,
  },
  footerColNarrow: {
    flex: 0.85,
    maxWidth: 100,
  },
  footerBack: {
    justifyContent: 'flex-end',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapHint: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 14,
  },
});
