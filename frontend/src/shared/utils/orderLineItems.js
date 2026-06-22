function resolveUnitPrice(item) {
  const direct = Number(item.price ?? item.unitPrice ?? 0);
  if (direct > 0) return direct;
  const fromProduct = Number(item.product?.price ?? 0);
  if (fromProduct > 0) return fromProduct;
  return Number(item.menuItem?.price ?? 0);
}

function resolveItemName(item) {
  return (
    item.name ||
    item.product?.name ||
    item.menuItem?.name ||
    item.title ||
    'Ürün'
  );
}

/** Sipariş satırlarını orderItems veya items alanından normalize eder */
export function getOrderLineItems(order) {
  if (!order) return [];

  const rawItems =
    Array.isArray(order.orderItems) && order.orderItems.length > 0
      ? order.orderItems
      : Array.isArray(order.items)
        ? order.items
        : [];

  return rawItems.map((item, index) => {
    const qty = Math.max(1, Number(item.qty || 1));
    const unitPrice = resolveUnitPrice(item);
    const lineTotal = unitPrice * qty;

    return {
      id: item._id || `line-${index}`,
      name: resolveItemName(item),
      qty,
      unitPrice,
      lineTotal,
      note: String(item.note || '').trim(),
    };
  });
}

export function formatOrderMoney(value) {
  return `₺${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

export function getOrderTotalAmount(order, lineItems) {
  const direct = Number(order?.total ?? order?.totalPrice ?? 0);
  if (direct > 0) return direct;
  return (lineItems || getOrderLineItems(order)).reduce((sum, line) => sum + line.lineTotal, 0);
}

const STATUS_LABELS = {
  hazirlaniyor: 'Hazırlanıyor',
  serviste: 'Serviste',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
  ödendi: 'Ödendi',
  PAID: 'Ödendi',
  CREATED: 'Oluşturuldu',
  SENT_TO_KITCHEN: 'Mutfakta',
  IN_PREP: 'Hazırlanıyor',
  READY: 'Hazır',
  SERVED: 'Servis edildi',
  CANCELED: 'İptal',
};

export function getOrderStatusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

/** Genel sipariş notundan ödeme yöntemi satırını ayır */
export function splitOrderNotes(notes) {
  const raw = String(notes || '').trim();
  if (!raw) return { customerNote: '', paymentNote: '' };

  const parts = raw.split('|').map((p) => p.trim()).filter(Boolean);
  const paymentParts = [];
  const customerParts = [];

  parts.forEach((part) => {
    const lower = part.toLowerCase();
    if (lower.includes('odeme') || lower.includes('ödeme') || lower.includes('payment')) {
      paymentParts.push(part);
    } else {
      customerParts.push(part);
    }
  });

  if (paymentParts.length === 0 && customerParts.length === 0) {
    return { customerNote: raw, paymentNote: '' };
  }

  return {
    customerNote: customerParts.join(' · '),
    paymentNote: paymentParts.join(' · '),
  };
}
