import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
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
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { homeFonts } from '../constants/homeTheme';
import {
  CARD_ASPECT,
  CARD_FIELD_LAYOUT,
  CARD_HEIGHT,
  CARD_IMAGE,
  CARD_MAX_WIDTH,
  USE_CARD_IMAGE_TEMPLATE,
} from './paymentCardLayout';

const GOLD_LIGHT = '#DFC57A';
const GOLD_MID = '#B98D36';
const GOLD_DARK = '#9F7429';

const NAME_PLACEHOLDER = 'AD SOYAD';
const EXPIRY_PLACEHOLDER = 'AA/YY';
const CVV_PLACEHOLDER = '•••';
const PLACEHOLDER_GOLD = 'rgba(185, 141, 54, 0.42)';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function digitsOnly(value, maxLen) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, maxLen);
}

export function formatPanDisplay(digits) {
  const d = digitsOnly(digits, 16);
  const groups = [4, 4, 4, 4];
  const parts = [];
  let idx = 0;
  for (const size of groups) {
    let chunk = '';
    for (let i = 0; i < size; i += 1) {
      chunk += idx < d.length ? d[idx++] : '*';
    }
    parts.push(chunk);
  }
  return parts.join(' ');
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

function fieldBoxStyle(layout) {
  return {
    position: 'absolute',
    left: layout.left,
    top: layout.top,
    width: layout.width,
  };
}

function fieldTextStyle(layout, focused) {
  return {
    fontFamily: homeFonts.sansSemi,
    fontSize: layout.fontSize,
    letterSpacing: layout.letterSpacing ?? 0,
    color: GOLD_MID,
    textAlign: layout.textAlign || 'left',
    paddingVertical: Platform.OS === 'ios' ? 2 : 0,
    backgroundColor: 'transparent',
    ...(focused ? styles.goldInputFocused : null),
  };
}

/** Görselin üstüne bindirilen alanlar */
function CardImageShell({ source, children }) {
  return (
    <View style={[styles.cardOuter, styles.cardOuterImage]}>
      <Image source={source} style={styles.cardBgImage} resizeMode="cover" />
      <View style={styles.cardOverlay} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

function CardCurvesSvg() {
  const w = 92;
  const h = CARD_HEIGHT + 16;
  return (
    <View style={styles.cardCurves} pointerEvents="none">
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Defs>
          <SvgGradient id="curveGold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity="0.95" />
            <Stop offset="55%" stopColor={GOLD_MID} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={GOLD_DARK} stopOpacity="0.85" />
          </SvgGradient>
        </Defs>
        <Path
          d="M 78 10 C 48 52, 44 118, 74 226"
          stroke="url(#curveGold)"
          strokeWidth={1.35}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M 88 6 C 58 46, 54 112, 84 230"
          stroke="url(#curveGold)"
          strokeWidth={1.05}
          fill="none"
          strokeLinecap="round"
          opacity={0.72}
        />
      </Svg>
    </View>
  );
}

function ContactlessIcon() {
  const arcs = [
    { size: 26, border: 2 },
    { size: 18, border: 1.8 },
    { size: 10, border: 1.6 },
  ];
  return (
    <View style={styles.contactlessWrap} accessibilityElementsHidden>
      {arcs.map(({ size, border }) => (
        <View
          key={size}
          style={[
            styles.contactlessArc,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: border,
            },
          ]}
        />
      ))}
    </View>
  );
}

function GoldChip() {
  return (
    <View style={styles.chip}>
      <LinearGradient
        colors={['#F3D77E', '#D4AF37', '#B78A34']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.chipGridV} />
      <View style={[styles.chipGridV, styles.chipGridV2]} />
      <View style={styles.chipGridH} />
      <View style={[styles.chipGridH, styles.chipGridH2]} />
    </View>
  );
}

function CardBuiltShell({ children }) {
  return (
    <View style={styles.cardOuter}>
      <LinearGradient
        colors={['#FFFFFF', '#FDFCF9', '#F8F5EF']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <CardCurvesSvg />
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

export default function PaymentCardPreview({
  holder = '',
  number = '',
  expiry = '',
  cvv = '',
  onChangeNumber,
  onChangeHolder,
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
  const panDigits = digitsOnly(number, 16);
  const panDisplay =
    focused === 'number'
      ? panDigits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
      : formatPanDisplay(number);
  const lastFour = panDigits.slice(-4) || '••••';

  const layout = CARD_FIELD_LAYOUT;

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

  const renderTemplateFront = () => (
    <CardImageShell source={CARD_IMAGE.front}>
      <View style={fieldBoxStyle(layout.front.number)}>
        <TextInput
          ref={numberRef}
          style={fieldTextStyle(layout.front.number, focused === 'number')}
          value={panDisplay}
          onChangeText={(t) => onChangeNumber?.(digitsOnly(t, 16))}
          placeholder=""
          placeholderTextColor="transparent"
          keyboardType="number-pad"
          maxLength={22}
          editable={editable}
          onFocus={() => setFocused('number')}
          onBlur={() => setFocused(null)}
          returnKeyType="next"
          onSubmitEditing={() => nameRef.current?.focus()}
          selectionColor={GOLD_DARK}
        />
      </View>
      <View style={fieldBoxStyle(layout.front.holder)}>
        <TextInput
          ref={nameRef}
          style={fieldTextStyle(layout.front.holder, focused === 'holder')}
          value={holder}
          onChangeText={(t) => onChangeHolder?.(t.toUpperCase())}
          placeholder=""
          placeholderTextColor="transparent"
          autoCapitalize="characters"
          editable={editable}
          onFocus={() => setFocused('holder')}
          onBlur={() => setFocused(null)}
          returnKeyType="next"
          onSubmitEditing={() => expiryRef.current?.focus()}
          selectionColor={GOLD_DARK}
        />
      </View>
      <View style={fieldBoxStyle(layout.front.expiry)}>
        <TextInput
          ref={expiryRef}
          style={fieldTextStyle(layout.front.expiry, focused === 'expiry')}
          value={expiry}
          onChangeText={onChangeExpiry}
          placeholder={EXPIRY_PLACEHOLDER}
          placeholderTextColor={PLACEHOLDER_GOLD}
          keyboardType="number-pad"
          maxLength={5}
          editable={editable}
          onFocus={() => setFocused('expiry')}
          onBlur={() => setFocused(null)}
          returnKeyType="done"
          onSubmitEditing={() => goToBack()}
          selectionColor={GOLD_DARK}
        />
      </View>
    </CardImageShell>
  );

  const renderTemplateBack = () => (
    <CardImageShell source={CARD_IMAGE.back}>
      <View style={fieldBoxStyle(layout.back.cvv)}>
        <TextInput
          ref={cvvRef}
          style={fieldTextStyle(layout.back.cvv, focused === 'cvv')}
          value={cvv}
          onChangeText={onChangeCvv}
          placeholder=""
          placeholderTextColor="transparent"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          editable={editable}
          autoFocus
          onFocus={() => setFocused('cvv')}
          onBlur={() => setFocused(null)}
          returnKeyType="done"
          selectionColor={GOLD_DARK}
        />
      </View>
    </CardImageShell>
  );

  const renderBuiltFront = () => (
    <CardBuiltShell>
      <GoldChip />
      <View style={styles.panRow}>
        <TextInput
          ref={numberRef}
          style={[styles.panInput, focused === 'number' && styles.goldInputFocused]}
          value={panDisplay}
          onChangeText={(t) => onChangeNumber?.(digitsOnly(t, 16))}
          placeholder="**** **** *** ****"
          placeholderTextColor={PLACEHOLDER_GOLD}
          keyboardType="number-pad"
          maxLength={22}
          editable={editable}
          onFocus={() => setFocused('number')}
          onBlur={() => setFocused(null)}
          returnKeyType="next"
          onSubmitEditing={() => nameRef.current?.focus()}
          selectionColor={GOLD_DARK}
        />
        <ContactlessIcon />
      </View>
      <View style={styles.footer}>
        <View style={styles.footerCol}>
          <Text style={styles.fieldLabel}>KART SAHİBİ</Text>
          <TextInput
            ref={nameRef}
            style={[styles.goldInput, focused === 'holder' && styles.goldInputFocused]}
            value={holder}
            onChangeText={(t) => onChangeHolder?.(t.toUpperCase())}
            placeholder={NAME_PLACEHOLDER}
            placeholderTextColor={PLACEHOLDER_GOLD}
            autoCapitalize="characters"
            editable={editable}
            onFocus={() => setFocused('holder')}
            onBlur={() => setFocused(null)}
            returnKeyType="next"
            onSubmitEditing={() => expiryRef.current?.focus()}
            selectionColor={GOLD_DARK}
          />
        </View>
        <View style={[styles.footerCol, styles.footerColRight]}>
          <Text style={styles.fieldLabel}>SON KULLANMA</Text>
          <TextInput
            ref={expiryRef}
            style={[styles.goldInput, focused === 'expiry' && styles.goldInputFocused]}
            value={expiry}
            onChangeText={onChangeExpiry}
            placeholder={EXPIRY_PLACEHOLDER}
            placeholderTextColor={PLACEHOLDER_GOLD}
            keyboardType="number-pad"
            maxLength={5}
            editable={editable}
            onFocus={() => setFocused('expiry')}
            onBlur={() => setFocused(null)}
            returnKeyType="done"
            onSubmitEditing={() => goToBack()}
            selectionColor={GOLD_DARK}
          />
        </View>
      </View>
    </CardBuiltShell>
  );

  const renderBuiltBack = () => (
    <CardBuiltShell>
      <View style={styles.logoRow}>
        <Text style={styles.backTitle}>GÜVENLİK KODU</Text>
      </View>
      <View style={styles.stripRow}>
        <View style={styles.magStripe} />
      </View>
      <View style={styles.panRow}>
        <TextInput
          ref={cvvRef}
          style={[styles.panInput, styles.cvvInput, focused === 'cvv' && styles.goldInputFocused]}
          value={cvv}
          onChangeText={onChangeCvv}
          placeholder={CVV_PLACEHOLDER}
          placeholderTextColor={PLACEHOLDER_GOLD}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          editable={editable}
          autoFocus
          onFocus={() => setFocused('cvv')}
          onBlur={() => setFocused(null)}
          returnKeyType="done"
          selectionColor={GOLD_DARK}
        />
        <ContactlessIcon />
      </View>
      <View style={styles.footer}>
        <View style={styles.footerCol}>
          <Text style={styles.fieldLabel}>KART NO</Text>
          <Text style={styles.goldValueReadonly}>•••• {lastFour}</Text>
        </View>
      </View>
    </CardBuiltShell>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.cardShadow}>
        {!isBack
          ? USE_CARD_IMAGE_TEMPLATE
            ? renderTemplateFront()
            : renderBuiltFront()
          : USE_CARD_IMAGE_TEMPLATE
            ? renderTemplateBack()
            : renderBuiltBack()}
      </View>

      {isBack ? (
        <Pressable
          style={({ pressed }) => [styles.flipCta, pressed && { opacity: 0.9 }]}
          onPress={goToFront}
        >
          <Ionicons name="chevron-back-circle" size={18} color={GOLD_DARK} />
          <Text style={styles.flipCtaText}>Ön yüze dön</Text>
        </Pressable>
      ) : null}

      <Text style={styles.tapHint}>
        {isBack
          ? 'CVV girin ve alttan kartı onaylayın'
          : frontReady
            ? 'Arka yüze geçiliyor…'
            : 'Kart numarası, isim ve son kullanma tarihi gerekli'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    alignSelf: 'center',
  },
  cardShadow: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: '#FAF7F1',
    shadowColor: '#1A1206',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 38,
    elevation: 22,
  },
  cardOuter: {
    position: 'relative',
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    aspectRatio: CARD_ASPECT,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardOuterImage: {
    backgroundColor: 'transparent',
  },
  cardBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  cardCurves: {
    position: 'absolute',
    top: -8,
    right: 0,
    width: 92,
    height: CARD_HEIGHT + 16,
    zIndex: 1,
  },
  cardContent: {
    flex: 1,
    zIndex: 2,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  logoRow: {
    zIndex: 3,
    marginBottom: 2,
  },
  chip: {
    width: 42,
    height: 32,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(120, 86, 22, 0.25)',
    zIndex: 3,
  },
  chipGridV: {
    position: 'absolute',
    left: 13,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(120, 86, 22, 0.22)',
  },
  chipGridV2: { left: 26 },
  chipGridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 10,
    height: 1,
    backgroundColor: 'rgba(120, 86, 22, 0.22)',
  },
  chipGridH2: { top: 20 },
  panRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
    zIndex: 3,
  },
  panInput: {
    flex: 1,
    fontFamily: homeFonts.sansSemi,
    fontSize: 19,
    letterSpacing: 2,
    color: GOLD_MID,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    minHeight: 32,
    backgroundColor: 'transparent',
  },
  cvvInput: {
    letterSpacing: 6,
    textAlign: 'left',
  },
  contactlessWrap: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    transform: [{ rotate: '90deg' }],
  },
  contactlessArc: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderColor: GOLD_MID,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    zIndex: 3,
  },
  footerCol: { flex: 1, minWidth: 0 },
  footerColRight: { alignItems: 'flex-end' },
  fieldLabel: {
    fontFamily: homeFonts.sans,
    fontSize: 9,
    letterSpacing: 1.1,
    color: GOLD_MID,
    opacity: 0.88,
    marginBottom: 3,
  },
  goldInput: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    letterSpacing: 0.7,
    color: GOLD_MID,
    paddingVertical: Platform.OS === 'ios' ? 2 : 0,
    minHeight: 20,
    backgroundColor: 'transparent',
  },
  goldValueReadonly: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    letterSpacing: 0.7,
    color: GOLD_MID,
  },
  goldInputFocused: {
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(185, 141, 54, 0.45)',
  },
  backTitle: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    color: GOLD_MID,
    opacity: 0.9,
  },
  stripRow: { marginBottom: 12, marginTop: 2, zIndex: 3 },
  magStripe: {
    height: 40,
    borderRadius: 6,
    backgroundColor: '#2C2C2C',
    width: '100%',
  },
  flipCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(223, 197, 122, 0.14)',
  },
  flipCtaText: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 14,
    color: GOLD_DARK,
  },
  tapHint: {
    fontFamily: homeFonts.sans,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },
});
