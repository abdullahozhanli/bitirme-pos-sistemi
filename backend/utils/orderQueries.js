const { PAYMENT_STATUS, CANCEL_ORDER_STATUS } = require('./orderPayment');

/** Ödeme bekleyen siparişler (kasa / garson listeleri) */
function unpaidPaymentMatch(extra = {}) {
  return {
    ...extra,
    paymentStatus: { $nin: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED] },
    $or: [{ paidAt: null }, { paidAt: { $exists: false } }],
    status: { $nin: ['ödendi', 'PAID', CANCEL_ORDER_STATUS, 'CANCELED', 'iptal'] },
  };
}

/** Gelir raporu: tahsil edilmiş siparişler */
function paidPaymentMatch(extra = {}) {
  return {
    ...extra,
    $or: [
      { paymentStatus: PAYMENT_STATUS.PAID },
      { paidAt: { $ne: null } },
      { status: { $in: ['ödendi', 'PAID'] } },
    ],
  };
}

module.exports = {
  unpaidPaymentMatch,
  paidPaymentMatch,
};
