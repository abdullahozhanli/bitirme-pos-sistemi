/**
 * Geliştirmede boş baseURL → Vite proxy (/api → VITE_API_URL).
 * Production build'de tam API adresi.
 */
export function getApiBaseURL() {
  if (import.meta.env.DEV) {
    return '';
  }
  const url = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return url;
}

