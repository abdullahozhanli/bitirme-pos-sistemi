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
import { colors } from '../constants/theme';
import { useTableSession } from '../context/TableSessionContext';
import { parseQrPayload } from '../utils/parseQrPayload';

const BUTTON_GRADIENT = ['#3FA34D', '#66BB6A'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function QRScannerScreen({ navigation }) {
  const { setTableNumber, setBranchId, setBranchName } = useTableSession();
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
      await setTableNumber(data.tableNumber);
      await setBranchId(data.branchId || null);
      await setBranchName(data.branchName || null);
      setProcessing(false);
      navigation.replace('Menu');
      return true;
    },
    [navigation, setTableNumber, setBranchId, setBranchName]
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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (showCamera && !permission.granted) {
    return (
      <SafeAreaView style={styles.safePermission} edges={['top', 'bottom']}>
        <Header navigation={navigation} />
        <View style={styles.centered}>
          <Text style={styles.info}>
            QR okutmak için kamera izni gerekli.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <LinearGradient
              colors={BUTTON_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>İzin ver</Text>
            </LinearGradient>
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
          <View style={styles.scanFrame}>
            <Animated.View style={[styles.scanLine, scanLineStyle]} />
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <Text style={styles.hintTitle}>QR Kodunu Tara</Text>
          <Text style={styles.hint}>
            QR okundugunda otomatik yonlendirileceksiniz
          </Text>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        </View>

        <SafeAreaView edges={['bottom']} style={styles.bottomSafe} />
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
        <Text style={styles.manualLabel}>Manuel giris</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        placeholder="https://.../order?table=5"
        placeholderTextColor={colors.textMuted}
        value={manual}
        onChangeText={setManual}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primaryBtn} onPress={onSubmit}>
        <LinearGradient
          colors={BUTTON_GRADIENT}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.primaryBtnGradient}
        >
          <Text style={styles.primaryBtnText}>Onayla</Text>
        </LinearGradient>
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
    borderRadius: 14,
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
    paddingHorizontal: 24,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 20,
    position: 'relative',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: '#57D07E',
    shadowColor: '#57D07E',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 18,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 18,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 18,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 18,
  },
  scanLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '50%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(140,255,176,0.95)',
    shadowColor: '#8CFFB0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  hintTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBanner: {
    marginTop: 4,
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
  bottomSafe: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  manualLink: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  manualLinkText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
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
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    marginBottom: 8,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
