/** 1 parapuan = 0,1 TL indirim */
const POINT_VALUE_TRY = 0.1;
/** Sepet tutarının en fazla %30'u puanla kapatılabilir */
const MAX_POINT_DISCOUNT_RATE = 0.3;

/**
 * Siparişte kullanılabilecek puan indirimini hesaplar (tam puan adedi).
 * @returns {{ pointsDiscountTry: number, pointsRedeemed: number, error?: string }}
 */
function computePointsRedemption({
  cartTotalAfterOtherDiscounts,
  loyaltyPointsBalance,
  requestedDiscountTry,
  pointValueTry = POINT_VALUE_TRY,
  maxRate = MAX_POINT_DISCOUNT_RATE,
}) {
  const cart = Math.max(0, Number(cartTotalAfterOtherDiscounts) || 0);
  const balance = Math.max(0, Math.floor(Number(loyaltyPointsBalance) || 0));

  if (cart <= 0 || balance <= 0) {
    return { pointsDiscountTry: 0, pointsRedeemed: 0 };
  }

  const maxByCart = Number((cart * maxRate).toFixed(2));
  const maxByBalance = Number((balance * pointValueTry).toFixed(2));
  const requested = Math.max(0, Number(requestedDiscountTry) || 0);
  const cap = Math.min(maxByCart, maxByBalance, cart, requested > 0 ? requested : maxByBalance);

  if (cap <= 0) {
    return { pointsDiscountTry: 0, pointsRedeemed: 0 };
  }

  let pointsRedeemed = Math.min(balance, Math.floor(cap / pointValueTry + 1e-9));
  if (pointsRedeemed <= 0) {
    return { pointsDiscountTry: 0, pointsRedeemed: 0 };
  }

  let pointsDiscountTry = Number((pointsRedeemed * pointValueTry).toFixed(2));
  if (pointsDiscountTry > cart) {
    pointsRedeemed = Math.min(balance, Math.floor(cart / pointValueTry + 1e-9));
    pointsDiscountTry = Number((pointsRedeemed * pointValueTry).toFixed(2));
  }

  if (pointsRedeemed > balance) {
    return { pointsDiscountTry: 0, pointsRedeemed: 0, error: 'Yetersiz parapuan' };
  }

  return { pointsDiscountTry, pointsRedeemed };
}

function computePointsEarned(orderTotalTry) {
  const total = Math.max(0, Number(orderTotalTry) || 0);
  if (total <= 0) return 0;
  return Math.max(1, Math.floor(total / 10));
}

module.exports = {
  POINT_VALUE_TRY,
  MAX_POINT_DISCOUNT_RATE,
  computePointsRedemption,
  computePointsEarned,
};
