import { NativeModules, Platform } from 'react-native';

const API_PORT = '5001';

function trimUrl(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/, '');
}

function deriveDevHostUrl() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return '';

  const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//i);
  if (!match?.[1]) return '';

  return `http://${match[1]}:${API_PORT}`;
}

const envUrl = trimUrl(process.env.EXPO_PUBLIC_API_URL);
const devHostUrl = __DEV__ ? deriveDevHostUrl() : '';
const emulatorUrl = Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : '';
const localhostUrl = `http://localhost:${API_PORT}`;

export const API_BASE_URL_CANDIDATES = [
  envUrl,
  devHostUrl,
  emulatorUrl,
  localhostUrl,
].filter((url, index, arr) => Boolean(url) && arr.indexOf(url) === index);

export const API_BASE_URL = API_BASE_URL_CANDIDATES[0] || localhostUrl;
