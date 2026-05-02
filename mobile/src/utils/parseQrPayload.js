/**
 * Web QRScannerPage ile aynı: URL (?table= & branch=) veya düz masa numarası.
 * @param {string} qrText
 * @returns {{ tableNumber: string, branchId: string | null } | null}
 */
export function parseQrPayload(qrText) {
  if (!qrText || typeof qrText !== 'string') return null;
  const trimmed = qrText.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const tableParam = url.searchParams.get('table');
    const branchParam = url.searchParams.get('branch');
    if (tableParam) {
      return { tableNumber: String(tableParam).trim(), branchId: branchParam || null };
    }
  } catch {
    // URL değil
  }

  if (/^\d+$/.test(trimmed)) {
    return { tableNumber: trimmed, branchId: null };
  }

  return null;
}
