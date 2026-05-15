import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';

const PROFILE_UPLOAD_MAX_WIDTH = 512;
const PROFILE_JPEG_COMPRESS = 0.82;

export async function ensureProfilePhotoLibraryPermission() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('İzin gerekli', 'Profil fotoğrafı için galeriye erişim izni verin.');
    return false;
  }
  return true;
}

/**
 * Galeriden foto seç (kırpma kapalı — Android uyumluluğu).
 * @returns {{ uri: string } | null}
 */
export async function pickProfileImageUri() {
  const ok = await ensureProfilePhotoLibraryPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    base64: false,
  });

  const canceled = result.canceled === true || result.cancelled === true;
  if (canceled || !result.assets?.[0]?.uri) return null;
  return { uri: result.assets[0].uri };
}

/** Yüklemeden önce küçültülmüş JPEG dosya URI'si üretir. */
export async function prepareProfileAvatarFileUri(sourceUri) {
  const manipulated = await manipulateAsync(
    sourceUri,
    [{ resize: { width: PROFILE_UPLOAD_MAX_WIDTH } }],
    {
      compress: PROFILE_JPEG_COMPRESS,
      format: SaveFormat.JPEG,
    }
  );
  if (!manipulated?.uri) {
    throw new Error('Fotoğraf işlenemedi');
  }
  return manipulated.uri;
}
