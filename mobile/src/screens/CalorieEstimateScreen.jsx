import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { estimateCalories } from '../api/calorie';

const COLORS = {
  bg: '#F8F7F4',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  primary: '#111827',
  primaryText: '#FFFFFF',
  success: '#16A34A',
};

export default function CalorieEstimateScreen({ navigation }) {
  const [mealText, setMealText] = useState('');
  const [previewUri, setPreviewUri] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni vermelisiniz.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (picked.canceled || !picked.assets?.length) return;
    setPreviewUri(picked.assets[0].uri || '');
    setImageBase64(picked.assets[0].base64 || '');
    setResult(null);
  }

  async function runEstimate() {
    if (!mealText.trim() && !imageBase64) {
      Alert.alert('Eksik Bilgi', 'Metin yazın veya fotoğraf ekleyin.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await estimateCalories({ text: mealText, imageBase64 });
      setResult(data);
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Tahmin alınamadı. Lütfen tekrar deneyin.';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  }

  function clearImage() {
    setPreviewUri('');
    setImageBase64('');
    setResult(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Kalori Tahmini</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Öğün açıklaması</Text>
          <TextInput
            value={mealText}
            onChangeText={setMealText}
            placeholder="Örn: 1 porsiyon tavuk döner, az pilav, ayran"
            placeholderTextColor={COLORS.muted}
            multiline
            maxLength={600}
            style={styles.input}
          />

          <View style={styles.row}>
            <Pressable style={styles.secondaryBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={18} color={COLORS.text} />
              <Text style={styles.secondaryBtnText}>Fotoğraf Seç</Text>
            </Pressable>
            {imageBase64 ? (
              <Pressable style={styles.clearBtn} onPress={clearImage}>
                <Text style={styles.clearBtnText}>Kaldır</Text>
              </Pressable>
            ) : null}
          </View>

          {previewUri ? <Image source={{ uri: previewUri }} style={styles.preview} /> : null}

          <Pressable style={styles.primaryBtn} onPress={runEstimate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.primaryText} />
            ) : (
              <Text style={styles.primaryBtnText}>Tahmin Et</Text>
            )}
          </Pressable>
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Tahmini Kalori</Text>
            <Text style={styles.resultValue}>{result.estimatedCalories} kcal</Text>
            <View style={styles.confidenceChip}>
              <Text style={styles.confidenceText}>Güven: {result.confidence}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: { width: 36, height: 36 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
  },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    textAlignVertical: 'top',
    backgroundColor: '#FAFAFA',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  secondaryBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  clearBtnText: { color: COLORS.muted, fontSize: 12 },
  preview: { width: '100%', height: 160, borderRadius: 12, backgroundColor: '#E5E7EB' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: COLORS.primaryText, fontSize: 15, fontWeight: '600' },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: { color: COLORS.muted, fontSize: 13 },
  resultValue: { color: COLORS.text, fontSize: 30, fontWeight: '700' },
  confidenceChip: {
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  confidenceText: { color: COLORS.success, fontSize: 12, fontWeight: '600' },
});
