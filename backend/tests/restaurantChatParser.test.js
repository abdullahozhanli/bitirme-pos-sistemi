import { describe, expect, it } from 'vitest';
import {
  normalizeText,
  parseRestaurantQuery,
  isRestaurantRelated,
  filterProductsByParsedQuery,
  buildFilteredProductsReply,
} from '../services/restaurantChatParser.js';

const sampleMenu = [
  {
    id: 'p1',
    name: 'Tavuk Burger',
    category: 'Burger',
    station: 'hot',
    inStock: true,
    hasApprovedNutrition: true,
    calories: 520,
    protein: 28,
    price: 120,
    allergens: ['gluten'],
    ingredients: ['tavuk', 'ekmek'],
  },
  {
    id: 'p2',
    name: 'Sade Sütlaç',
    category: 'Tatlı',
    station: 'dessert',
    inStock: true,
    hasApprovedNutrition: true,
    calories: 180,
    protein: 5,
    price: 65,
    allergens: ['laktoz', 'fistik'],
    ingredients: ['sut', 'pirinc'],
  },
  {
    id: 'p3',
    name: 'Latte',
    category: 'İçecek',
    station: 'bar',
    inStock: true,
    hasApprovedNutrition: true,
    calories: 120,
    protein: 6,
    price: 55,
    allergens: ['laktoz'],
    ingredients: ['sut', 'kahve'],
  },
  {
    id: 'p4',
    name: 'Ayran',
    category: 'İçecek',
    station: 'cold',
    inStock: true,
    hasApprovedNutrition: true,
    calories: 75,
    protein: 4,
    price: 25,
    allergens: ['laktoz'],
    ingredients: ['ayran', 'yogurt'],
  },
];

describe('parseRestaurantQuery', () => {
  it('sütlü tatlı → kategori + süt include', () => {
    const q = parseRestaurantQuery('sütlü tatlı var mı');
    expect(q.categoryTerms.some((t) => t.includes('tatli') || t === 'tatli')).toBe(true);
    expect(q.includeTerms).toContain('sut');
  });

  it('sütlü içecek → içecek kategorisi + süt include', () => {
    const q = parseRestaurantQuery('sütlü içecek var mı');
    expect(q.categoryTerms.some((t) => t.includes('icecek') || t === 'icecek')).toBe(true);
    expect(q.includeTerms).toContain('sut');
  });

  it('sütsüz tatlı → exclude süt', () => {
    const q = parseRestaurantQuery('sütsüz tatlı var mı');
    expect(q.excludeTerms).toContain('sut');
  });
});

describe('filterProductsByParsedQuery', () => {
  it('sütlü tatlı → yalnızca tatlı + süt', () => {
    const q = parseRestaurantQuery('sütlü tatlı var mı');
    const { matched } = filterProductsByParsedQuery(sampleMenu, q);
    const names = matched.map((p) => p.name);
    expect(names).toContain('Sade Sütlaç');
    expect(names).not.toContain('Tavuk Burger');
    expect(names).not.toContain('Latte');
    expect(names).not.toContain('Ayran');
  });

  it('sütlü içecek → yalnızca içecek + süt', () => {
    const q = parseRestaurantQuery('sütlü içecek var mı');
    const { matched } = filterProductsByParsedQuery(sampleMenu, q);
    const names = matched.map((p) => p.name);
    expect(names).toContain('Latte');
    expect(names).toContain('Ayran');
    expect(names).not.toContain('Tavuk Burger');
    expect(names).not.toContain('Sade Sütlaç');
  });

  it('süt içeren ne var → kategori filtresi olmadan süt içerenler', () => {
    const q = parseRestaurantQuery('süt içeren ne var');
    const { matched } = filterProductsByParsedQuery(sampleMenu, q);
    const names = matched.map((p) => p.name);
    expect(names).toContain('Sade Sütlaç');
    expect(names).toContain('Latte');
    expect(names).not.toContain('Tavuk Burger');
  });

  it('fıstık alerjim var → fıstıksız ürünler', () => {
    const q = parseRestaurantQuery('fıstık alerjim var ne yiyebilirim');
    const { matched } = filterProductsByParsedQuery(sampleMenu, q);
    const names = matched.map((p) => p.name);
    expect(names).toContain('Tavuk Burger');
    expect(names).not.toContain('Sade Sütlaç');
  });
});

describe('isRestaurantRelated', () => {
  it('film öner → false', () => {
    expect(isRestaurantRelated('bana film öner', sampleMenu)).toBe(false);
  });

  it('sütlü tatlı → true', () => {
    expect(isRestaurantRelated('sütlü tatlı var mı', sampleMenu)).toBe(true);
  });
});

describe('normalizeText', () => {
  it('süt ve sut aynı', () => {
    expect(normalizeText('SÜT')).toBe(normalizeText('sut'));
  });
});
