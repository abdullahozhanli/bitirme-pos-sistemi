export const TABLE_STATUS_CLASS = {
  bos: 'available',
  dolu: 'full',
  rezerve: 'reserved',
  odeme_bekliyor: 'payment_pending',
};

export const TABLE_STATUS_SHORT_LABELS = {
  bos: 'MÜSAİT',
  dolu: 'DOLU',
  rezerve: 'REZERVE',
  odeme_bekliyor: 'ÖDEME',
};

export function getTableStatusClass(status) {
  return TABLE_STATUS_CLASS[status] || 'available';
}

export function getTableStatusLabel(status, customLabels) {
  if (customLabels?.[status]) return customLabels[status];
  return TABLE_STATUS_SHORT_LABELS[status] || status || '—';
}
