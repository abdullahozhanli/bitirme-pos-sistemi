/**
 * E-posta biçimi (pratik doğrulama).
 * Örn. "user@gmail" (TLD yok) veya çift @ reddedilir.
 */
export function isValidEmail(value) {
  if (value == null || typeof value !== 'string') return false;
  const s = value.trim().toLowerCase();
  if (s.length < 5 || s.length > 254) return false;

  const atParts = s.split('@');
  if (atParts.length !== 2) return false;

  const [local, domain] = atParts;
  if (!local || !domain) return false;
  if (!/^[a-z0-9._%+-]+$/.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;

  if (!domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;

  const labels = domain.split('.');
  const tld = labels[labels.length - 1];
  if (!tld || tld.length < 2 || tld.length > 63) return false;
  if (!/^[a-z]{2,}$/i.test(tld)) return false;

  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) return false;
  }

  return true;
}

export const PASSWORD_POLICY_MESSAGE =
  'Şifre en az 8 karakter olmalı; en az bir büyük harf, bir küçük harf, bir rakam ve bir sembol içermelidir.';

export function isStrongPassword(value) {
  const s = String(value || '');
  if (s.length < 8) return false;
  if (!/[a-z]/.test(s)) return false;
  if (!/[A-Z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  if (!/[^A-Za-z0-9]/.test(s)) return false;
  return true;
}

/** Kayıt / şifre ekranında anlık tik listesi için (isStrongPassword ile aynı kurallar). */
export function getPasswordCriteriaState(value) {
  const s = String(value || '');
  return {
    minLength: s.length >= 8,
    lower: /[a-z]/.test(s),
    upper: /[A-Z]/.test(s),
    digit: /[0-9]/.test(s),
    symbol: /[^A-Za-z0-9]/.test(s),
  };
}
