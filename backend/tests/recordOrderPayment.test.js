const { normalizeStaffMethod, todayKey } = require('../utils/recordOrderPayment');

describe('recordOrderPayment helpers', () => {
  test('normalizeStaffMethod defaults to cash', () => {
    expect(normalizeStaffMethod()).toBe('cash');
    expect(normalizeStaffMethod('nakit')).toBe('cash');
  });

  test('normalizeStaffMethod accepts card', () => {
    expect(normalizeStaffMethod('card')).toBe('card');
  });

  test('todayKey returns YYYYMMDD', () => {
    expect(todayKey(new Date('2026-05-23T12:00:00Z'))).toMatch(/^\d{8}$/);
  });
});
