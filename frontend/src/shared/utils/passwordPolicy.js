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
