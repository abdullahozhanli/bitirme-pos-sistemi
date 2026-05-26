import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL_CANDIDATES } from '../constants/config';
import { isUnauthorizedError, notifyUnauthorized } from './authSession';

const TOKEN_KEY = 'selfkasa_token';

async function readAuthToken() {
  try {
    if (Platform.OS === 'web') {
      const t = await AsyncStorage.getItem(TOKEN_KEY);
      return t ? String(t).trim() : null;
    }
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    return t ? String(t).trim() : null;
  } catch {
    return null;
  }
}

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

async function authFetchWithFallback(path, init) {
  const token = await readAuthToken();
  if (!token) throw new Error('Oturum bulunamadı');

  const bearer = `Bearer ${token}`;
  let lastErr;

  for (const base of API_BASE_URL_CANDIDATES) {
    const url = `${String(base).replace(/\/+$/, '')}${path}`;
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: bearer,
          'x-auth-token': token,
          ...(init.headers || {}),
        },
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        const err = new Error(data.message || `HTTP ${res.status}`);
        err.response = { status: res.status, data };
        lastErr = err;
        if (res.status === 401 || res.status === 403) {
          await notifyUnauthorized();
          throw err;
        }
        continue;
      }
      return data;
    } catch (e) {
      lastErr = e;
      if (isUnauthorizedError(e)) {
        await notifyUnauthorized();
        throw e;
      }
      if (e?.message && !String(e.message).includes('Network')) throw e;
    }
  }

  throw lastErr || new Error('İstek başarısız');
}

/** @param {string} localUri */
export function uploadProfileAvatarFile(localUri) {
  const formData = new FormData();
  formData.append('avatar', {
    uri: localUri,
    type: 'image/jpeg',
    name: 'avatar.jpg',
  });

  return authFetchWithFallback('/api/auth/me/avatar', {
    method: 'POST',
    body: formData,
  });
}

export function deleteProfileAvatarRequest() {
  return authFetchWithFallback('/api/auth/me/avatar', {
    method: 'DELETE',
  });
}
