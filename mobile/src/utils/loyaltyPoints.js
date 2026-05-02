/**
 * Parapuan (points ?? loyaltyPoints, çelişkide önce points)
 */
export function getLoyaltyPoints(user) {
  if (!user || typeof user !== 'object') return 0;
  const n = Number(user.points ?? user.loyaltyPoints ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Yerel kayıt / login: iki alanı aynı sayıya kilitle */
export function coerceUserPoints(u) {
  if (!u || typeof u !== 'object') return u;
  const safe = getLoyaltyPoints(u);
  return { ...u, points: safe, loyaltyPoints: safe };
}

/** /api/auth/me ile birleştir; puanı yalnızca cevaptaki değerden al (eksikse 0) */
export function mergeUserFromMe(prev, meData) {
  const d = meData && typeof meData === 'object' ? meData : {};
  const raw = d.points ?? d.loyaltyPoints;
  const n = Number(raw ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return { ...(prev || {}), ...d, points: safe, loyaltyPoints: safe };
}
