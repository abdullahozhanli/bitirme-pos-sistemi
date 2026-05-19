export const PASSWORD_POLICY_MESSAGE =
  'Şifre en az 8 karakter olmalı; en az bir büyük harf, bir küçük harf, bir rakam ve bir sembol içermelidir.';

export function getPasswordChecks(value) {
  const s = String(value || '');
  return {
    minLength: s.length >= 8,
    lower: /[a-z]/.test(s),
    upper: /[A-Z]/.test(s),
    digit: /[0-9]/.test(s),
    symbol: /[^A-Za-z0-9]/.test(s),
  };
}

export function isStrongPassword(value) {
  const c = getPasswordChecks(value);
  return c.minLength && c.lower && c.upper && c.digit && c.symbol;
}
