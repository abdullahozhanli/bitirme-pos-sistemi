import { describe, expect, it } from 'vitest';
import {
  buildInitialPaymentFromCheckout,
  isOrderPaid,
  applyPaidToOrder,
} from '../utils/orderPayment.js';

describe('buildInitialPaymentFromCheckout', () => {
  it('rejects fake online payment in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const r = buildInitialPaymentFromCheckout({
      paymentMethod: 'online',
      paymentConfirmed: true,
    });
    process.env.NODE_ENV = prev;
    expect(r.error).toBeTruthy();
  });

  it('marks online confirmed as paid only when demo flag set', () => {
    const prev = process.env.ALLOW_DEMO_ONLINE_PAYMENT;
    process.env.ALLOW_DEMO_ONLINE_PAYMENT = 'true';
    const r = buildInitialPaymentFromCheckout({
      paymentMethod: 'online',
      paymentConfirmed: true,
    });
    process.env.ALLOW_DEMO_ONLINE_PAYMENT = prev;
    expect(r.paymentStatus).toBe('paid');
    expect(r.paymentMethod).toBe('online');
    expect(r.paidAt).toBeTruthy();
  });

  it('keeps table unpaid', () => {
    const r = buildInitialPaymentFromCheckout({ paymentMethod: 'table' });
    expect(r.paymentStatus).toBe('unpaid');
    expect(r.paidAt).toBeNull();
  });
});

describe('isOrderPaid', () => {
  it('uses paymentStatus and paidAt', () => {
    expect(isOrderPaid({ paymentStatus: 'paid' })).toBe(true);
    expect(isOrderPaid({ paidAt: new Date() })).toBe(true);
    expect(isOrderPaid({ paymentStatus: 'unpaid' })).toBe(false);
  });
});

describe('applyPaidToOrder', () => {
  it('sets ödendi status', () => {
    const order = { status: 'hazirlaniyor' };
    applyPaidToOrder(order, { method: 'cash' });
    expect(order.status).toBe('ödendi');
    expect(order.paymentStatus).toBe('paid');
  });
});
