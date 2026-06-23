import { describe, expect, it } from 'vitest';
import {
  getStaticReply,
  isRestaurantRelated,
  buildGeminiPrompt,
  tryRuleBasedReply,
  tryParsedQueryReply,
  STATIC_REPLIES,
} from '../services/nutritionChatService.js';

const sampleMenu = [
  {
    id: 'prod1',
    name: 'Tavuk Burger',
    category: 'Burger',
    price: 120,
    station: 'hot',
    inStock: true,
    countInStock: 5,
    hasApprovedNutrition: true,
    calories: 520,
    protein: 28,
    carbs: 42,
    fat: 22,
    allergens: ['gluten', 'susam'],
    ingredients: ['tavuk', 'ekmek'],
    nutritionStatus: 'approved',
    isNutritionVisibleToCustomer: true,
  },
  {
    id: 'prod2',
    name: 'Sade Sütlaç',
    category: 'Tatlı',
    price: 65,
    station: 'dessert',
    inStock: true,
    countInStock: 10,
    hasApprovedNutrition: true,
    calories: 180,
    protein: 5,
    carbs: 30,
    fat: 4,
    allergens: ['laktoz', 'fistik'],
    ingredients: ['sut', 'pirinc'],
    nutritionStatus: 'approved',
    isNutritionVisibleToCustomer: true,
  },
  {
    id: 'prod3',
    name: 'Mystery Soup',
    category: 'Çorba',
    price: 45,
    station: 'hot',
    inStock: true,
    countInStock: 3,
    hasApprovedNutrition: false,
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    allergens: [],
    ingredients: [],
    nutritionStatus: 'none',
    isNutritionVisibleToCustomer: false,
  },
  {
    id: 'prod4',
    name: 'Latte',
    category: 'İçecek',
    station: 'bar',
    inStock: true,
    countInStock: 8,
    hasApprovedNutrition: true,
    calories: 120,
    protein: 6,
    price: 55,
    allergens: ['laktoz'],
    ingredients: ['sut', 'kahve'],
    nutritionStatus: 'approved',
    isNutritionVisibleToCustomer: true,
  },
];

describe('getStaticReply', () => {
  it('selam → sabit karşılama, static source', () => {
    const r = getStaticReply('selam');
    expect(r.source).toBe('static');
    expect(r.reply).toBe(STATIC_REPLIES.greeting);
  });

  it('teşekkür ederim → sabit teşekkür cevabı', () => {
    const r = getStaticReply('teşekkür ederim');
    expect(r.source).toBe('static');
    expect(r.reply).toBe(STATIC_REPLIES.thanks);
  });

  it('görüşürüz → sabit veda cevabı', () => {
    const r = getStaticReply('görüşürüz');
    expect(r.source).toBe('static');
    expect(r.reply).toBe(STATIC_REPLIES.goodbye);
  });
});

describe('isRestaurantRelated', () => {
  it('film öner → konu dışı', () => {
    expect(isRestaurantRelated('bana film öner', sampleMenu)).toBe(false);
  });

  it('kalori sorusu → restoran kapsamında', () => {
    expect(isRestaurantRelated('180 kalorilik ne yiyebilirim?', sampleMenu)).toBe(true);
  });

  it('ürün adı geçiyorsa → restoran kapsamında', () => {
    expect(isRestaurantRelated('tavuk burger kaç kalori?', sampleMenu)).toBe(true);
  });

  it('süt içeren ne var → restoran kapsamında', () => {
    expect(isRestaurantRelated('süt içeren ne var', sampleMenu)).toBe(true);
  });

  it('süt içermeyen ne var → restoran kapsamında', () => {
    expect(isRestaurantRelated('süt içermeyen ne var', sampleMenu)).toBe(true);
  });

  it('laktoz içeren ürün var mı → restoran kapsamında', () => {
    expect(isRestaurantRelated('laktoz içeren ürün var mı', sampleMenu)).toBe(true);
  });

  it('gluten içermeyen ne var → restoran kapsamında', () => {
    expect(isRestaurantRelated('gluten içermeyen ne var', sampleMenu)).toBe(true);
  });

  it('fıstık alerjim var ne yiyebilirim → restoran kapsamında', () => {
    expect(isRestaurantRelated('fıstık alerjim var ne yiyebilirim', sampleMenu)).toBe(true);
  });
});

describe('tryRuleBasedReply', () => {
  const recommendMenu = sampleMenu.filter((p) => p.hasApprovedNutrition && p.inStock);

  it('180 kalorilik ne yiyebilirim → hedefe yakın ürün önerisi', () => {
    const r = tryRuleBasedReply({
      message: '180 kalorilik ne yiyebilirim?',
      allMenu: sampleMenu,
      recommendMenu,
      cartItems: [],
      history: [],
    });
    expect(r).not.toBeNull();
    expect(r.source).toBe('rule-target');
    expect(r.reply).toMatch(/180/);
    expect(r.recommendedProductIds.length).toBeGreaterThan(0);
  });

  it('tavuk burger kaç kalori → onaylı kalori bilgisi', () => {
    const r = tryRuleBasedReply({
      message: 'tavuk burger kaç kalori?',
      allMenu: sampleMenu,
      recommendMenu,
      cartItems: [],
      history: [],
    });
    expect(r.source).toBe('rule-product');
    expect(r.reply).toMatch(/520/);
    expect(r.reply).toMatch(/Tavuk Burger/i);
  });

  it('onaysız ürün → onaylı besin değeri yok mesajı', () => {
    const r = tryRuleBasedReply({
      message: 'mystery soup kaç kalori?',
      allMenu: sampleMenu,
      recommendMenu,
      cartItems: [],
      history: [],
    });
    expect(r.source).toBe('rule-product');
    expect(r.reply).toMatch(/onaylı besin değeri bulunmuyor/i);
  });

  it('fıstık alerjisi + tatlı → alerjen bilgisi ve personel uyarısı', () => {
    const r = tryRuleBasedReply({
      message: 'fıstık alerjim var bu tatlıyı yiyebilir miyim?',
      allMenu: sampleMenu,
      recommendMenu,
      cartItems: [],
      history: [],
    });
    expect(r.source).toBe('rule-allergen');
    expect(r.reply).toMatch(/alerjen/i);
    expect(r.reply).toMatch(/personeline danışmanız/i);
  });

  it('süt içeren ne var → süt/laktoz içeren ürünleri listeler', () => {
    const r = tryParsedQueryReply('süt içeren ne var', sampleMenu);
    expect(r.source).toBe('rule');
    expect(r.reply).toMatch(/içeren|Sütlaç|Latte/i);
    expect(r.recommendedProductIds).toContain('prod2');
  });

  it('sütlü tatlı var mı → yalnızca tatlı kategorisi', () => {
    const r = tryParsedQueryReply('sütlü tatlı var mı', sampleMenu);
    expect(r.source).toBe('rule');
    expect(r.reply).toMatch(/Sade Sütlaç/i);
    expect(r.reply).not.toMatch(/Tavuk Burger/i);
    expect(r.reply).not.toMatch(/Latte/i);
  });

  it('sütlü içecek var mı → yalnızca içecek kategorisi', () => {
    const r = tryParsedQueryReply('sütlü içecek var mı', sampleMenu);
    expect(r.reply).toMatch(/Latte/i);
    expect(r.reply).not.toMatch(/Sade Sütlaç/i);
    expect(r.reply).not.toMatch(/Tavuk Burger/i);
  });

  it('süt içermeyen ne var → süt içermeyen onaylı ürünleri listeler', () => {
    const r = tryParsedQueryReply('süt içermeyen ne var', sampleMenu);
    expect(r.source).toBe('rule');
    expect(r.reply).toMatch(/Filtrenize uygun|içermediği onaylı/i);
    expect(r.reply).toMatch(/Tavuk Burger/i);
    expect(r.reply).not.toMatch(/Sade Sütlaç/i);
  });

  it('laktoz içeren ürün var mı → eşleşen ürün döner', () => {
    const r = tryParsedQueryReply('laktoz içeren ürün var mı', sampleMenu);
    expect(r.source).toBe('rule');
    expect(r.reply).toMatch(/laktoz|Latte|Sütlaç/i);
    expect(r.recommendedProductIds.length).toBeGreaterThan(0);
  });

  it('gluten içermeyen ne var → glutensiz onaylı ürün önerir', () => {
    const r = tryParsedQueryReply('gluten içermeyen ne var', sampleMenu);
    expect(r.source).toBe('rule');
    expect(r.reply).toMatch(/Filtrenize uygun|gluten/i);
    expect(r.reply).toMatch(/Sade Sütlaç/i);
    expect(r.reply).not.toMatch(/Tavuk Burger/i);
  });

  it('fıstık alerjim var ne yiyebilirim → fıstıksız ürün listesi', () => {
    const r = tryParsedQueryReply('fıstık alerjim var ne yiyebilirim', sampleMenu);
    expect(r.source).toBe('rule');
    expect(r.reply).toMatch(/Filtrenize uygun|fıstık/i);
    expect(r.reply).toMatch(/Tavuk Burger/i);
    expect(r.reply).not.toMatch(/Sade Sütlaç/i);
  });
});

describe('buildGeminiPrompt', () => {
  it('system instruction ve ürün listesi içerir', () => {
    const { systemInstruction } = buildGeminiPrompt('Test Şube', sampleMenu, []);
    expect(systemInstruction).toMatch(/Self Kasa/);
    expect(systemInstruction).toMatch(/Tavuk Burger/);
    expect(systemInstruction).toMatch(/onaylı besin değeri bulunmuyor/);
    expect(systemInstruction).toMatch(/recommendedProductIds/);
  });
});
