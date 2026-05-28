/** Müşteri mobil checkout */
const CUSTOMER_PAYMENT_METHODS = ['table', 'cashier', 'online'];

/** Personel tahsilat */
const STAFF_PAYMENT_METHODS = ['cash', 'card'];

const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded',
};

const PAID_ORDER_STATUS = 'ödendi';
const CANCEL_ORDER_STATUS = 'iptal';

function isOrderPaid(order) {
  if (!order) return false;
  if (order.paymentStatus === PAYMENT_STATUS.PAID) return true;
  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) return false;
  if (order.paidAt) return true;
  const s = String(order.status || '').toLowerCase();
  return s === 'ödendi' || s === 'paid';
}

function normalizePaymentMethod(value) {
  const v = String(value || '').trim().toLowerCase();
  if (CUSTOMER_PAYMENT_METHODS.includes(v)) return v;
  if (STAFF_PAYMENT_METHODS.includes(v)) return v;
  return null;
}

/**
 * Siparişi ödendi olarak işaretle (tek standart: ödendi + paidAt + paymentStatus).
 * @param {import('mongoose').Document} order
 * @param {{ method?: string, paidAt?: Date }} options
 */
function applyPaidToOrder(order, options = {}) {
  const paidAt = options.paidAt || new Date();
  const method = normalizePaymentMethod(options.method) || order.paymentMethod || null;

  order.status = PAID_ORDER_STATUS;
  order.paidAt = paidAt;
  order.paymentStatus = PAYMENT_STATUS.PAID;
  if (method) order.paymentMethod = method;

  return order;
}

function applyUnpaidToOrder(order, method) {
  const m = normalizePaymentMethod(method);
  if (m) order.paymentMethod = m;
  order.paymentStatus = PAYMENT_STATUS.UNPAID;
  if (!order.paidAt) {
    order.paidAt = undefined;
  }
  return order;
}

function buildInitialPaymentFromCheckout(body) {
  const method = normalizePaymentMethod(body?.paymentMethod);
  const confirmed = body?.paymentConfirmed === true || body?.paymentConfirmed === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemoOnline =
    !isProduction && process.env.ALLOW_DEMO_ONLINE_PAYMENT === 'true';

  if (method === 'online') {
    if (isProduction) {
      return {
        error:
          'Online ödeme henüz etkin değil. Lütfen masada öde veya kasada öde seçin.',
      };
    }
    if (!allowDemoOnline) {
      return {
        error:
          'Online ödeme demo modunda kapalı. ALLOW_DEMO_ONLINE_PAYMENT=true ile açılabilir.',
      };
    }
    if (!confirmed) {
      return { error: 'Online ödeme için paymentConfirmed gerekli' };
    }
    return {
      paymentMethod: 'online',
      paymentStatus: PAYMENT_STATUS.PAID,
      paidAt: new Date(),
    };
  }

  if (method === 'table' || method === 'cashier') {
    return {
      paymentMethod: method,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      paidAt: null,
    };
  }

  return {
    paymentMethod: method,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    paidAt: null,
  };
}

module.exports = {
  CUSTOMER_PAYMENT_METHODS,
  STAFF_PAYMENT_METHODS,
  PAYMENT_STATUS,
  PAID_ORDER_STATUS,
  CANCEL_ORDER_STATUS,
  isOrderPaid,
  normalizePaymentMethod,
  applyPaidToOrder,
  applyUnpaidToOrder,
  buildInitialPaymentFromCheckout,
};
