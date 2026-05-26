import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { homeFonts, androidRipple } from '../constants/homeTheme';
import { colors } from '../constants/theme';
import { useTableSession } from '../context/TableSessionContext';
import { parseQrPayload } from '../utils/parseQrPayload';

const PRIMARY_GRADIENT = ['#2F8F39', '#4CAF50', '#67C96B'];
const SCAN_CORNER = '#4ADE80';
const SCAN_CORNER_SOFT = 'rgba(74, 222, 128, 0.55)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function QRScannerScreen({ navigation }) {
  const { connectFromQr } = useTableSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [barcodeEnabled, setBarcodeEnabled] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const manualSubmitLock = useRef(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setBarcodeEnabled(true);
      setProcessing(false);
      manualSubmitLock.current = false;
      setError('');
      setManualOpen(false);
      setFlashOn(false);
    }, [])
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  const scanLineStyle = {
    transform: [
      {
        translateY: scanAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-92, 92],
        }),
      },
    ],
    opacity: scanAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0.85],
    }),
  };

  const applyScan = useCallback(
    async (qrText) => {
      const data = parseQrPayload(qrText);
      if (!data?.tableNumber) {
        setError('Geçersiz QR. Masadaki kodu okutun veya URL / masa no girin.');
        return false;
      }
      setBarcodeEnabled(false);
      setProcessing(true);
      await sleep(500);
      await connectFromQr({
        tableNumber: data.tableNumber,
        branchId: data.branchId || null,
        branchName: data.branchName || null,
        tableId: data.tableId || data.tableNumber,
        restaurantId: data.branchId || null,
        restaurantName: data.branchName || null,
      });
      setProcessing(false);
      navigation.replace('Menu');
      return true;
    },
    [navigation, connectFromQr]
  );

  const onBarcodeScanned = useCallback(
    ({ data }) => {
      if (!barcodeEnabled || processing) return;
      applyScan(data);
    },
    [barcodeEnabled, processing, applyScan]
  );

  const submitManual = async () => {
    if (manualSubmitLock.current) return;
    manualSubmitLock.current = true;
    setError('');
    await applyScan(manual.trim());
    manualSubmitLock.current = false;
  };

  const showCamera = Platform.OS !== 'web';

  if (showCamera && !permission) {
    return (
      <SafeAreaView style={styles.safePermission} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera && !permission.granted) {
    return (
      <SafeAreaView style={styles.safePermission} edges={['top', 'bottom']}>
        <View style={styles.permissionHeaderSafe}>
          <Pressable
            style={({ pressed }) => [styles.topIconBtn, pressed && styles.btnPressed]}
            onPress={() => navigation.goBack()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.info}>
            QR okutmak için kamera izni gerekli.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.permissionPrimaryBtn, pressed && { opacity: 0.92 }]}
            onPress={requestPermission}
            android_ripple={{ color: 'rgba(255,255,255,0.22)', foreground: true }}
          >
            <LinearGradient
              colors={PRIMARY_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.primaryBtnText}>İzin ver</Text>
          </Pressable>
        </View>
        <ManualBlock
          manual={manual}
          setManual={setManual}
          error={error}
          onSubmit={submitManual}
          onClose={() => setManualOpen(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      {showCamera ? (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={flashOn}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          barcodeScannerEnabled={barcodeEnabled && !processing}
          onBarcodeScanned={onBarcodeScanned}
        />
      ) : (
        <View style={styles.webBox}>
          <Text style={styles.webHint}>
            Web onizlemede kamera yok; QR icerigini veya masa numarasini yapistirin.
          </Text>
        </View>
      )}

      <View style={styles.overlay}>
        <SafeAreaView edges={['top']} style={styles.overlayTopSafe}>
          <View style={styles.topRow}>
            <Pressable
              style={({ pressed }) => [styles.topIconBtn, pressed && styles.btnPressed]}
              onPress={() => navigation.goBack()}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.topIconBtn, pressed && styles.btnPressed]}
              onPress={() => setFlashOn((s) => !s)}
              hitSlop={10}
            >
              <Ionicons
                name={flashOn ? 'flash' : 'flash-off'}
                size={20}
                color={flashOn ? '#F7F48B' : colors.white}
              />
            </Pressable>
          </View>
        </SafeAreaView>

        <View style={styles.centerWrap}>
          <View style={styles.scanCard}>
            <View style={styles.scanFrame}>
              <Animated.View style={[styles.scanLine, scanLineStyle]} />
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>

            <Text style={styles.hintTitle}>QR kodunu tara</Text>
            <Text style={styles.hint}>
              Kod okununca menüye yönlendirileceksin
            </Text>
            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
          </View>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
          <Pressable
            style={({ pressed }) => [styles.manualPill, pressed && { opacity: 0.9 }]}
            onPress={() => setManualOpen(true)}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
          >
            <Ionicons name="keypad-outline" size={18} color="rgba(255,255,255,0.95)" />
            <Text style={styles.manualPillText}>Manuel giriş</Text>
          </Pressable>
        </SafeAreaView>
      </View>

      {processing ? (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.processingText}>Yonlendiriliyor...</Text>
        </View>
      ) : null}

      <Modal visible={manualOpen} transparent animationType="slide" onRequestClose={() => setManualOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setManualOpen(false)} />
          <ManualBlock
            manual={manual}
            setManual={setManual}
            error={error}
            onSubmit={submitManual}
            onClose={() => setManualOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

function ManualBlock({ manual, setManual, error, onSubmit, onClose }) {
  return (
    <View style={styles.manualSheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHead}>
        <Text style={styles.manualLabel}>Manuel giriş</Text>
        <Pressable onPress={onClose} hitSlop={10} android_ripple={androidRipple}>
          <Ionicons name="close" size={20} color="#7A7168" />
        </Pressable>
      </View>
      <TextInput
        style={styles.sheetInput}
        placeholder="https://.../order?table=5"
        placeholderTextColor="#7A7168"
        value={manual}
        onChangeText={setManual}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.sheetPrimaryBtn, pressed && { opacity: 0.92 }]}
        onPress={onSubmit}
        android_ripple={{ color: 'rgba(255,255,255,0.22)', foreground: true }}
      >
        <LinearGradient
          colors={PRIMARY_GRADIENT}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.primaryBtnText}>Onayla</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.black,
  },
  safePermission: {
    flex: 1,
    backgroundColor: '#0E131A',
  },
  permissionHeaderSafe: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 18, 0.42)',
    justifyContent: 'space-between',
  },
  overlayTopSafe: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  scanCard: {
    width: '100%',
    maxWidth: 328,
    borderRadius: 28,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 12,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 22,
    position: 'relative',
    marginBottom: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: SCAN_CORNER,
    shadowColor: SCAN_CORNER,
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '50%',
    height: 3,
    borderRadius: 2,
    backgroundColor: '#86EFAC',
    shadowColor: SCAN_CORNER_SOFT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  hintTitle: {
    fontFamily: homeFonts.sansSemi,
    color: colors.white,
    fontSize: 19,
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  hint: {
    fontFamily: homeFonts.sans,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 0,
    paddingHorizontal: 4,
  },
  errorBanner: {
    marginTop: 10,
    fontFamily: homeFonts.sansMedium,
    color: '#FECACA',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  bottomSafe: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 4,
    alignItems: 'center',
  },
  manualPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  manualPillText: {
    fontFamily: homeFonts.sansSemi,
    color: 'rgba(255,255,255,0.96)',
    fontSize: 14,
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  info: {
    fontFamily: homeFonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  webBox: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  webHint: {
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  processingText: {
    fontFamily: homeFonts.sansSemi,
    color: colors.white,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  manualSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.divider,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  manualLabel: {
    fontFamily: homeFonts.sansSemi,
    fontSize: 15,
    color: '#1F2933',
    letterSpacing: -0.2,
  },
  sheetInput: {
    fontFamily: homeFonts.sans,
    backgroundColor: '#F9FBF8',
    borderWidth: 1,
    borderColor: '#D7E7D8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2933',
    marginBottom: 10,
    shadowColor: '#1F2933',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  error: {
    fontFamily: homeFonts.sansMedium,
    color: '#B42318',
    fontSize: 13,
    marginBottom: 8,
  },
  permissionPrimaryBtn: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: 320,
    borderRadius: 999,
    minHeight: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryBtn: {
    borderRadius: 999,
    minHeight: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: homeFonts.sansSemi,
    color: colors.white,
    fontSize: 16,
  },
});
