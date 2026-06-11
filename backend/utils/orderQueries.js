const { PAYMENT_STATUS, CANCEL_ORDER_STATUS } = require('./orderPayment');

/** Masa / mutfak için kapalı sayılan sipariş durumları */
const CLOSED_ORDER_STATUSES = [
  'tamamlandi',
  'PAID',
  'SERVED',
  'CANCELED',
  'iptal',
  'ödendi',
  CANCEL_ORDER_STATUS,
];

/** Mutfakta gösterilecek aktif iş durumları */
const KITCHEN_WORK_STATUSES = [
  'CREATED',
  'SENT_TO_KITCHEN',
  'IN_PREP',
  'READY',
  'hazirlaniyor',
  'serviste',
];

/**
 * Açık sipariş sorgusu (ödenmemiş + kapalı olmayan).
 * `extra` içinde `$or` (masa eşlemesi vb.) güvenle birleştirilir.
 */
function openOrderMatch(extra = {}) {
  const { $or: scopeOr, ...rest } = extra;
  const clauses = [];

  if (Object.keys(rest).length > 0) clauses.push(rest);
  if (scopeOr) clauses.push({ $or: scopeOr });

  clauses.push({
    paymentStatus: { $nin: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED] },
    status: { $nin: CLOSED_ORDER_STATUSES },
  });
  clauses.push({
    $or: [{ paidAt: null }, { paidAt: { $exists: false } }],
  });

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

function tableOrderScope(tableId) {
  return {
    $or: [{ table: tableId }, { tableId: tableId }],
  };
}

/** Mutfak ekranı — açık ve mutfakta işlenmesi gereken siparişler */
function kitchenQueueOrderMatch(extra = {}) {
  const base = openOrderMatch(extra);
  const kitchenStatus = { status: { $in: KITCHEN_WORK_STATUSES } };
  if (base.$and) {
    return { $and: [...base.$and, kitchenStatus] };
  }
  return { $and: [base, kitchenStatus] };
}

/** Ödeme bekleyen siparişler (kasa / garson listeleri) */
function unpaidPaymentMatch(extra = {}) {
  return openOrderMatch(extra);
}

/** Gelir raporu: tahsil edilmiş siparişler */
function paidPaymentMatch(extra = {}) {
  return {
    ...extra,
    $or: [
      { paymentStatus: PAYMENT_STATUS.PAID },
      { paidAt: { $ne: null } },
      { status: { $in: ['ödendi', 'PAID', 'tamamlandi', 'SERVED'] } },
    ],
  };
}

module.exports = {
  CLOSED_ORDER_STATUSES,
  KITCHEN_WORK_STATUSES,
  openOrderMatch,
  tableOrderScope,
  kitchenQueueOrderMatch,
  unpaidPaymentMatch,
  paidPaymentMatch,
};
