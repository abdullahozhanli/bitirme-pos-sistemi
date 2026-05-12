import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_BASE_URL_CANDIDATES } from '../constants/config';

const TOKEN_KEY = 'selfkasa_token';

/** Galeri / aktivite yenilenince axios varsayılan başlıkları kaybolabiliyor; her istekte taze token */
async function readAuthToken() {
  try {
    if (Platform.OS === 'web') {
      const t = await AsyncStorage.getItem(TOKEN_KEY);
      return t ? String(t).trim() : null;
    }
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    return t ? String(t).trim() : null;
  } catch (e) {
    console.warn('readAuthToken', e?.message || e);
    return null;
  }
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await readAuthToken();
  if (token) {
    const bearer = `Bearer ${token}`;
    const h = config.headers;
    if (h && typeof h.set === 'function') {
      h.set('Authorization', bearer);
      h.set('x-auth-token', token);
    } else {
      config.headers = {
        ...(config.headers || {}),
        Authorization: bearer,
        'x-auth-token': token,
      };
    }
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const isNetworkError = !error?.response && Boolean(config);
    if (!isNetworkError) throw error;

    const currentIndex = Number.isInteger(config._apiFallbackIndex)
      ? config._apiFallbackIndex
      : API_BASE_URL_CANDIDATES.indexOf(config.baseURL || API_BASE_URL);
    const nextIndex = currentIndex + 1;
    const nextBaseUrl = API_BASE_URL_CANDIDATES[nextIndex];

    if (!nextBaseUrl) throw error;

    config._apiFallbackIndex = nextIndex;
    config.baseURL = nextBaseUrl;
    return client.request(config);
  }
);

export default client;
