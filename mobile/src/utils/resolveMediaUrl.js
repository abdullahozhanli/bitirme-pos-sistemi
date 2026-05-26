import { API_BASE_URL } from '../constants/config';

function extractUploadPath(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (s.startsWith('/uploads/')) return s.split('?')[0];

  try {
    const pathname = new URL(s).pathname;
    if (pathname.startsWith('/uploads/')) return pathname.split('?')[0];
  } catch {
    const idx = s.indexOf('/uploads/');
    if (idx >= 0) return s.slice(idx).split('?')[0];
  }
  return '';
}

/** Sunucudan gelen /uploads/... yollarını tam URL yapar; data: ve https: olduğu gibi kalır. */
export function resolveMediaUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (/^data:/i.test(s)) return s;

  const base = String(API_BASE_URL || '').replace(/\/+$/, '');
  const uploadPath = extractUploadPath(s);
  if (uploadPath && base) {
    return `${base}${uploadPath}`;
  }

  if (/^https?:\/\//i.test(s)) return s;

  if (base) {
    const path = s.startsWith('/') ? s : `/${s}`;
    return `${base}${path}`;
  }

  return s;
}
