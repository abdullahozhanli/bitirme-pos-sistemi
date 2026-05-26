export function isOrderPaid(order) {
  if (!order) return false;
  if (order.paymentStatus === 'paid') return true;
  if (order.paymentStatus === 'refunded') return false;
  if (order.paidAt) return true;
  const s = String(order.status || '').toLowerCase();
  return s === 'ödendi' || s === 'paid';
}

/** Garson/admin masa ve sipariş listeleri — mobil müşteri ödeme tercihi */
export function getOrderPaymentDisplayText(order) {
  if (!order) return '—';
  const method = String(order.paymentMethod || '').toLowerCase();

  if (method === 'online') {
    return 'Online · Ödendi';
  }

  if (isOrderPaid(order)) {
    if (method === 'cash') return 'Ödendi · Nakit';
    if (method === 'card') return 'Ödendi · Kart';
    return 'Ödendi';
  }

  if (method === 'table') return 'Masada ödenecek';
  if (method === 'cashier') return 'Kasada ödenecek';

  return isOrderPaid(order) ? 'Ödendi' : 'Ödeme bekliyor';
}

export function canCancelOrderUi(order) {
  if (!order) return false;
  const s = String(order.status || '');
  if (s === 'iptal' || s === 'CANCELED') return false;
  const early = ['hazirlaniyor', 'CREATED', 'SENT_TO_KITCHEN'];
  if (!early.includes(s)) return false;
  const lines = [...(order.orderItems || []), ...(order.items || [])];
  return !lines.some((line) => ['STARTED', 'IN_PREP'].includes(line?.status));
}
