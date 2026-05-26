import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const API_PORT = '5001';
const isSimulator = Constants.isDevice === false;

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
/** Yalnızca Android emülatörde; fiziksel telefonda 10.0.2.2 yanlış sunucuya gider → sahte 401 */
const emulatorUrl =
  __DEV__ && Platform.OS === 'android' && isSimulator ? `http://10.0.2.2:${API_PORT}` : '';
const localhostUrl =
  __DEV__ && (Platform.OS === 'web' || isSimulator) ? `http://localhost:${API_PORT}` : '';

const devCandidates = envUrl
  ? [envUrl, ...(devHostUrl && devHostUrl !== envUrl ? [devHostUrl] : [])]
  : [devHostUrl, emulatorUrl, localhostUrl];
const prodCandidates = [envUrl];

export const API_BASE_URL_CANDIDATES = (__DEV__ ? devCandidates : prodCandidates).filter(
  (url, index, arr) => Boolean(url) && arr.indexOf(url) === index
);

export const API_BASE_URL =
  API_BASE_URL_CANDIDATES[0] ||
  (__DEV__ ? localhostUrl : envUrl) ||
  '';
