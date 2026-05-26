export const SESSION_DURATION_MS = 60 * 60 * 1000;

export function buildTableSession({
  tableNumber,
  branchId = null,
  branchName = null,
  tableId = null,
  restaurantId = null,
  restaurantName = null,
}) {
  const now = new Date();
  const num = String(tableNumber || '').trim();
  return {
    restaurantId: restaurantId || branchId || 'default',
    restaurantName: restaurantName || branchName || 'Self Kasa Cafe',
    tableId: tableId || num,
    tableName: num ? `Masa ${num}` : String(tableId || ''),
    tableNumber: num,
    branchId: branchId || null,
    branchName: branchName || null,
    connectedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(),
  };
}

export function isSessionValid(session) {
  if (!session?.expiresAt) return false;
  return new Date(session.expiresAt).getTime() > Date.now();
}

export const TABLE_SESSION_KEY = 'selfKasaTableSession';

export function formatConnectedTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
