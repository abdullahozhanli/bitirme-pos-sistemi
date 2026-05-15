import { API_BASE_URL } from '../constants/config';

/** Sunucudan gelen /uploads/... yollarını tam URL yapar; data: ve https: olduğu gibi kalır. */
export function resolveMediaUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (/^data:/i.test(s) || /^https?:\/\//i.test(s)) return s;
  const base = String(API_BASE_URL || '').replace(/\/+$/, '');
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${base}${path}`;
}
