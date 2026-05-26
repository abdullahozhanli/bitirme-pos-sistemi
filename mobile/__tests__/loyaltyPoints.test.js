import {
  coerceUserPoints,
  getLoyaltyPoints,
  mergeUserFromMe,
} from '../src/utils/loyaltyPoints';

describe('getLoyaltyPoints', () => {
  it('prefers points over loyaltyPoints', () => {
    expect(getLoyaltyPoints({ points: 10, loyaltyPoints: 99 })).toBe(10);
  });

  it('returns 0 for invalid user', () => {
    expect(getLoyaltyPoints(null)).toBe(0);
    expect(getLoyaltyPoints({ points: 'x' })).toBe(0);
  });
});

describe('coerceUserPoints', () => {
  it('syncs both point fields', () => {
    expect(coerceUserPoints({ points: 42 })).toMatchObject({
      points: 42,
      loyaltyPoints: 42,
    });
  });
});

describe('mergeUserFromMe', () => {
  it('merges profile and keeps passwordMeetsPolicy when true', () => {
    const merged = mergeUserFromMe(
      { name: 'Ali', passwordMeetsPolicy: false },
      { email: 'a@b.com', points: 5, passwordMeetsPolicy: true }
    );
    expect(merged).toMatchObject({
      name: 'Ali',
      email: 'a@b.com',
      points: 5,
      loyaltyPoints: 5,
      passwordMeetsPolicy: true,
    });
  });
});
