import { describe, expect, it } from 'vitest';
import {
  computePointsEarned,
  computePointsRedemption,
} from '../utils/loyaltyPoints.js';

describe('computePointsRedemption', () => {
  it('limits by balance and 30% cart cap', () => {
    const r = computePointsRedemption({
      cartTotalAfterOtherDiscounts: 100,
      loyaltyPointsBalance: 500,
      requestedDiscountTry: 50,
    });
    expect(r.pointsDiscountTry).toBe(30);
    expect(r.pointsRedeemed).toBe(300);
  });

  it('uses all points when cart allows', () => {
    const r = computePointsRedemption({
      cartTotalAfterOtherDiscounts: 200,
      loyaltyPointsBalance: 80,
      requestedDiscountTry: 8,
    });
    expect(r.pointsRedeemed).toBe(80);
    expect(r.pointsDiscountTry).toBe(8);
  });
});

describe('computePointsEarned', () => {
  it('earns at least 1 point per 10 TL', () => {
    expect(computePointsEarned(25)).toBe(2);
    expect(computePointsEarned(0)).toBe(0);
  });
});
