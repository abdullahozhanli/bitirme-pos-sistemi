/** @type {(() => Promise<void>) | null} */
let unauthorizedHandler = null;
let handlingUnauthorized = false;

export function registerUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function isUnauthorizedError(err) {
  const status = err?.response?.status;
  if (status === 401 || status === 403) return true;
  const msg = String(err?.response?.data?.message || err?.message || '').toLowerCase();
  return (
    msg.includes('yetkisiz') ||
    (msg.includes('geçersiz') && msg.includes('token')) ||
    msg.includes('süresi dolmuş') ||
    msg.includes('token bulunamadı')
  );
}

/**
 * 401/403: oturumu tek seferde kapat (çift Alert engellenir).
 * @param {{ silent?: boolean }} options
 */
export async function notifyUnauthorized(options = {}) {
  if (handlingUnauthorized || !unauthorizedHandler) return;
  handlingUnauthorized = true;
  try {
    await unauthorizedHandler(options);
  } finally {
    setTimeout(() => {
      handlingUnauthorized = false;
    }, 1500);
  }
}
