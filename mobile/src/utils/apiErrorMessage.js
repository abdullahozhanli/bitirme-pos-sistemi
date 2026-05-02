import { API_BASE_URL } from '../constants/config';

/**
 * Axios hatalarını kullanıcıya gösterilecek kısa metne çevirir.
 */
export function apiErrorMessage(err, fallback) {
  const serverMsg = err.response?.data?.message;
  if (serverMsg) return serverMsg;

  const isNetwork =
    !err.response &&
    (err.code === 'ERR_NETWORK' || String(err.message || '').includes('Network'));

  if (isNetwork) {
    return `Sunucuya ulaşılamıyor. Backend çalışıyor mu? Telefonda Expo Go ile deniyorsan mobile/.env içinde EXPO_PUBLIC_API_URL bilgisayarının yerel IP adresi olmalı (örn. http://192.168.1.10:5001); localhost telefonda PC'yi göstermez. Şu an: ${API_BASE_URL}`;
  }

  return err.message || fallback;
}
