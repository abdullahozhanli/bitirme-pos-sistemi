import { getProductDisplayPrices } from '../src/utils/productPricing';

describe('getProductDisplayPrices', () => {
  it('uses effective price and detects sale from list price', () => {
    const result = getProductDisplayPrices({
      price: 80,
      listPrice: 100,
    });
    expect(result).toEqual({
      effective: 80,
      list: 100,
      isOnSale: true,
    });
  });

  it('falls back when only effective price exists', () => {
    const result = getProductDisplayPrices({ price: 50 });
    expect(result.effective).toBe(50);
    expect(result.list).toBe(50);
    expect(result.isOnSale).toBe(false);
  });
});
