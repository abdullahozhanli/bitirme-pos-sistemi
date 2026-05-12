import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';

const MAX_DATA_URL = 440000;
/** Uzun kenar ~768px + JPEG: profil için yeterli, yükleme ve base64 çok hızlanır */
const PROFILE_UPLOAD_MAX_WIDTH = 768;
const PROFILE_JPEG_COMPRESS = 0.78;

function normalizeMime(m) {
  if (!m || typeof m !== 'string') return 'image/jpeg';
  if (m === 'image/jpg') return 'image/jpeg';
  return m;
}

async function uriToDataUrlViaFetch(uri) {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

function validateAndSizeCheck(dataUrl) {
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(String(dataUrl))) {
    Alert.alert('Desteklenmeyen format', 'JPEG, PNG veya WebP kullanın.');
    return null;
  }
  if (String(dataUrl).length > MAX_DATA_URL) {
    Alert.alert(
      'Çok büyük',
      'Daha küçük bir fotoğraf seçin veya daha düşük çözünürlüklü bir görsel kullanın.'
    );
    return null;
  }
  return dataUrl;
}

export async function ensureProfilePhotoLibraryPermission() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('İzin gerekli', 'Profil fotoğrafı için galeriye erişim izni verin.');
    return false;
  }
  return true;
}

/**
 * Sistem kırpıcısı Android'de sorunlu; düzenleme kapalı — sadece seçim.
 * @returns {{ uri: string, mimeType: string } | null}
 */
export async function pickProfileImageUri() {
  const ok = await ensureProfilePhotoLibraryPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.55,
    base64: false,
  });

  const canceled = result.canceled === true || result.cancelled === true;
  if (canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (!asset.uri) return null;
  return { uri: asset.uri, mimeType: normalizeMime(asset.mimeType) };
}

/** Büyük fotoğrafı küçültüp JPEG base64 üretir (sunucuya giden payload küçülür). */
export async function uriToProfileAvatarDataUrl(uri, mimeType = 'image/jpeg') {
  try {
    const manipulated = await manipulateAsync(
      uri,
      [{ resize: { width: PROFILE_UPLOAD_MAX_WIDTH } }],
      {
        compress: PROFILE_JPEG_COMPRESS,
        format: SaveFormat.JPEG,
        base64: true,
      }
    );

    if (manipulated.base64) {
      const dataUrl = `data:image/jpeg;base64,${manipulated.base64}`;
      return validateAndSizeCheck(dataUrl);
    }

    if (manipulated.uri) {
      const raw = await uriToDataUrlViaFetch(manipulated.uri);
      return validateAndSizeCheck(raw);
    }
  } catch (e) {
    console.warn('expo-image-manipulator', e?.message || e);
  }

  try {
    let dataUrl = await uriToDataUrlViaFetch(uri);
    const s = String(dataUrl);
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(s)) {
      const m = s.match(/^data:[^;]*;base64,(.+)$/i);
      if (m?.[1]) {
        dataUrl = `data:${normalizeMime(mimeType)};base64,${m[1]}`;
      } else {
        Alert.alert('Desteklenmeyen format', 'JPEG, PNG veya WebP kullanın.');
        return null;
      }
    }
    return validateAndSizeCheck(dataUrl);
  } catch {
    Alert.alert('Hata', 'Fotoğraf okunamadı. Başka bir görsel deneyin.');
    return null;
  }
}
