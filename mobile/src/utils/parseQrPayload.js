/**
 * Web QRScannerPage ile aynı: URL (?table= & branch=) veya düz masa numarası.
 * @param {string} qrText
 * @returns {{ tableNumber: string, branchId: string | null, branchName: string | null } | null}
 */
export function parseQrPayload(qrText) {
  if (!qrText || typeof qrText !== 'string') return null;
  const trimmed = qrText.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const tableParam = url.searchParams.get('table');
    const branchParam = url.searchParams.get('branch');
    const branchNameParam =
      url.searchParams.get('branchName') ||
      url.searchParams.get('name') ||
      url.searchParams.get('restaurant') ||
      url.searchParams.get('business');
    if (tableParam) {
      return {
        tableNumber: String(tableParam).trim(),
        branchId: branchParam || null,
        branchName: branchNameParam ? String(branchNameParam).trim() : null,
      };
    }
  } catch {
    // URL değil
  }

  if (/^\d+$/.test(trimmed)) {
    return { tableNumber: trimmed, branchId: null, branchName: null };
  }

  return null;
}
