/**
 * Restoran chatbot intent + entity parser ve ürün filtreleme.
 */

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

const CATEGORY_GROUPS = [
  {
    id: 'tatli',
    keys: ['tatli', 'dessert', 'sweet', 'pasta', 'brownie', 'kek'],
    match(product) {
      const b = productSearchBlob(product);
      return (
        pStation(product) === 'dessert' ||
        /tatli|dessert|sweet|pasta|brownie|kek|sutlac|kurabiye/.test(b)
      );
    },
  },
  {
    id: 'icecek',
    keys: ['icecek', 'drink', 'beverage', 'ayran', 'kola', 'cay', 'latte'],
    match(product) {
      const b = productSearchBlob(product);
      return (
        pStation(product) === 'bar' ||
        pStation(product) === 'cold' ||
        /icecek|drink|beverage|ayran|kola|cay|latte|kahve|coffee|smoothie|limonata/.test(b)
      );
    },
  },
  {
    id: 'pizza',
    keys: ['pizza'],
    match(product) {
      return /pizza/.test(productSearchBlob(product));
    },
  },
  {
    id: 'burger',
    keys: ['burger'],
    match(product) {
      return /burger|hamburger/.test(productSearchBlob(product));
    },
  },
  {
    id: 'salata',
    keys: ['salata', 'salad'],
    match(product) {
      return /salata|salad/.test(productSearchBlob(product));
    },
  },
  {
    id: 'corba',
    keys: ['corba', 'soup'],
    match(product) {
      return /corba|soup|çorba/.test(productSearchBlob(product));
    },
  },
  {
    id: 'kahve',
    keys: ['kahve', 'coffee', 'latte', 'espresso', 'cappuccino'],
    match(product) {
      const b = productSearchBlob(product);
      return /kahve|coffee|latte|espresso|cappuccino|americano|mocha/.test(b);
    },
  },
  {
    id: 'ana_yemek',
    keys: ['ana yemek', 'yemek', 'main'],
    match(product) {
      const b = productSearchBlob(product);
      const station = pStation(product);
      if (station === 'hot') return true;
      return /kebap|kofte|doner|pide|lahmacun|tavuk|et\b|pilav/.test(b);
    },
  },
];

const TERM_ALIASES = {
  sut: ['sut', 'sutlu', 'sut urunu', 'sut urunleri', 'laktoz', 'lactose', 'milk', 'dairy', 'peynir', 'yogurt', 'yoghurt', 'krema', 'tereyagi', 'kremali', 'peynirli', 'yogurtlu'],
  gluten: ['gluten', 'bugday', 'wheat', 'ekmek', 'glutensiz'],
  fistik: ['fistik', 'findik', 'yerfistigi', 'yer fistigi', 'peanut'],
  yumurta: ['yumurta', 'egg'],
  soya: ['soya', 'soy'],
  susam: ['susam', 'sesame'],
  balik: ['balik', 'fish', 'deniz urunu', 'deniz urunleri', 'karides', 'kabuklu'],
  hardal: ['hardal', 'mustard'],
  kereviz: ['kereviz', 'celery'],
};

const INCLUDE_HINTS = [
  'iceren', 'iceriyor', 'icinde', 'var mi', 'varmi', 'sutlu', 'peynirli', 'yogurtlu', 'kremali',
];
const EXCLUDE_HINTS = [
  'icermeyen', 'yok', 'olmasin', 'haric', 'sutsuz', 'glutensiz', 'laktozsuz', 'sekersiz', 'etsiz',
];

const RESTAURANT_KEYWORDS = [
  'menu', 'urun', 'yemek', 'icecek', 'tatli', 'burger', 'pizza', 'salata', 'corba', 'kahve',
  'kalori', 'kcal', 'protein', 'karbonhidrat', 'yag', 'besin', 'alerjen', 'alerji', 'icerik',
  'iceren', 'icermeyen', 'diyet', 'saglikli', 'hafif', 'vegan', 'vejetaryen', 'oner', 'tavsiye',
  'kampanya', 'indirim', 'puan', 'sadakat', 'sepet', 'siparis', 'odeme', 'masa', 'qr', 'garson',
  'yardim', 'sikayet', 'sut', 'sutlu', 'laktoz', 'gluten', 'fistik', 'peynir', 'yogurt',
];

const OFF_TOPIC_PATTERNS = [
  /\bfilm\b/, /\bdizi\b/, /\baraba\b/, /\bkod yaz\b/, /\bhava durumu\b/,
  /\bmac sonucu\b/, /\bsiyaset\b/, /\boyun oner\b/,
];

function pStation(product) {
  return normalizeText(product?.station || '');
}

function productSearchBlob(product) {
  const parts = [
    product?.name,
    product?.category,
    product?.description,
    product?.station,
    ...(product?.allergens || []),
    ...(product?.ingredients || []),
    ...(product?.tags || []),
  ];
  return normalizeText(parts.filter(Boolean).join(' '));
}

function productHasAllergenData(product) {
  return Boolean(product?.allergens?.length || product?.ingredients?.length);
}

function expandTerms(terms) {
  const out = new Set();
  for (const raw of terms || []) {
    const t = normalizeText(raw);
    if (!t) continue;
    out.add(t);
    if (TERM_ALIASES[t]) {
      TERM_ALIASES[t].forEach((a) => out.add(normalizeText(a)));
    }
    for (const [key, aliases] of Object.entries(TERM_ALIASES)) {
      if (aliases.some((a) => t.includes(normalizeText(a)) || normalizeText(a).includes(t))) {
        out.add(key);
        aliases.forEach((a) => out.add(normalizeText(a)));
      }
    }
  }
  return [...out];
}

function extractCategoryTerms(norm) {
  const terms = [];
  for (const group of CATEGORY_GROUPS) {
    if (group.keys.some((k) => norm.includes(normalizeText(k)))) {
      terms.push(group.id, ...group.keys.slice(0, 2));
    }
  }
  return [...new Set(terms)];
}

function productMatchesCategory(product, categoryTerms) {
  if (!categoryTerms?.length) return true;
  return CATEGORY_GROUPS.some(
    (group) =>
      (categoryTerms.includes(group.id) ||
        group.keys.some((k) => categoryTerms.includes(normalizeText(k)))) &&
      group.match(product)
  );
}

function productMatchesIncludeTerms(product, includeTerms) {
  const expanded = expandTerms(includeTerms);
  if (!expanded.length) return true;
  if (!productHasAllergenData(product)) return false;
  const blob = productSearchBlob(product);
  return expanded.some((t) => blob.includes(t));
}

function productMatchesExcludeTerms(product, excludeTerms) {
  const expanded = expandTerms(excludeTerms);
  if (!expanded.length) return false;
  const blob = productSearchBlob(product);
  return expanded.some((t) => blob.includes(t));
}

function createEmptyParsedQuery() {
  return {
    intent: 'menu_query',
    productName: null,
    categoryTerms: [],
    includeTerms: [],
    excludeTerms: [],
    dietTerms: [],
    calorieTarget: null,
    maxCalories: null,
    minProtein: null,
    maxPrice: null,
    sortBy: null,
    needsHuman: false,
  };
}

function extractSubstanceTerms(norm, mode) {
  const terms = [];
  for (const [key, aliases] of Object.entries(TERM_ALIASES)) {
    if (aliases.some((a) => norm.includes(normalizeText(a))) || norm.includes(key)) {
      terms.push(key);
    }
  }
  if (mode === 'include') {
    if (/\bsutlu\b/.test(norm)) terms.push('sut');
    if (/\bpeynirli\b/.test(norm)) terms.push('sut', 'peynir');
    if (/\byogurtlu\b/.test(norm)) terms.push('sut', 'yogurt');
    if (/\bkremali\b/.test(norm)) terms.push('sut', 'krema');
  }
  if (mode === 'exclude') {
    if (/\bsutsuz\b/.test(norm)) terms.push('sut');
    if (/\bglutensiz\b/.test(norm)) terms.push('gluten');
    if (/\blaktozsuz\b/.test(norm)) terms.push('sut', 'laktoz');
    if (/\bsekersiz\b/.test(norm)) terms.push('seker');
  }
  return [...new Set(terms)];
}

function parseRestaurantQuery(message) {
  const parsed = createEmptyParsedQuery();
  const norm = normalizeText(message);
  if (!norm) return parsed;

  parsed.categoryTerms = extractCategoryTerms(norm);

  const isExclude =
    EXCLUDE_HINTS.some((h) => norm.includes(h)) ||
    /alerj(i|im|isi|iniz)\s+var/.test(norm);
  const isInclude =
    !isExclude &&
    (INCLUDE_HINTS.some((h) => norm.includes(h)) || /ne var|hangi|oner|yiyebilir|yesem/.test(norm));

  if (isExclude) {
    parsed.excludeTerms = extractSubstanceTerms(norm, 'exclude');
    const allergyMatch = norm.match(/alerj(i|im|isi|iniz)\s+var\s+(\w+)/);
    if (allergyMatch?.[2]) parsed.excludeTerms.push(allergyMatch[2]);
    parsed.intent = 'allergen_query';
  } else if (isInclude) {
    parsed.includeTerms = extractSubstanceTerms(norm, 'include');
    parsed.intent = parsed.includeTerms.length ? 'ingredient_query' : 'menu_query';
  }

  if (/\bvegan\b/.test(norm)) parsed.dietTerms.push('vegan');
  if (/\bvejetaryen\b/.test(norm)) parsed.dietTerms.push('vejetaryen');
  if (/\b(diyet|saglikli|hafif|dusuk kalorili)\b/.test(norm)) parsed.dietTerms.push('light');

  const kcalExact = norm.match(/(\d{2,4})\s*(?:kcal|kalori(?:lik)?|kal)\b/);
  if (kcalExact) {
    const n = Number(kcalExact[1]);
    if (norm.includes('altinda') || norm.includes('gecmeyen') || norm.includes('dusuk')) {
      parsed.maxCalories = n;
    } else if (norm.includes('civari') || norm.includes('yaklasik') || norm.includes('hedef')) {
      parsed.calorieTarget = n;
    } else {
      parsed.calorieTarget = n;
    }
    parsed.intent = 'calorie_query';
  }

  const underKcal = norm.match(/(\d{2,4})\s*kalori(?:nin|nin)?\s*altinda/);
  if (underKcal) {
    parsed.maxCalories = Number(underKcal[1]);
    parsed.intent = 'calorie_query';
  }

  if (/proteinli|yuksek proteinli|protein/.test(norm)) {
    parsed.sortBy = 'protein_desc';
    parsed.intent = 'recommendation';
  }

  if (/en az kalorili|en dusuk kalorili/.test(norm)) {
    parsed.sortBy = 'calories_asc';
    parsed.intent = 'calorie_query';
  }

  const priceUnder = norm.match(/(\d+)\s*tl\s*alti/);
  if (priceUnder) {
    parsed.maxPrice = Number(priceUnder[1]);
    parsed.intent = 'menu_query';
  }
  if (/en ucuz|uygun fiyatli/.test(norm)) {
    parsed.sortBy = 'price_asc';
    parsed.intent = 'menu_query';
  }

  if (/sepet/.test(norm) && /kalori|protein|makro|toplam|analiz|diyet/.test(norm)) {
    parsed.intent = 'cart_analysis';
  }
  if (/kampanya|indirim/.test(norm)) parsed.intent = 'campaign_query';
  if (/puan|sadakat/.test(norm)) parsed.intent = 'loyalty_query';
  if (/siparis/.test(norm) && /hazir|nerede|durum|ne zaman/.test(norm)) {
    parsed.intent = 'order_status';
  }
  if (/odeme/.test(norm)) parsed.intent = 'payment_help';
  if (/qr|masa/.test(norm) && /okum|sec|yanlis|baglan/.test(norm)) {
    parsed.intent = 'table_qr_help';
  }
  if (/garson|yardim|sikayet|destek/.test(norm)) {
    parsed.intent = /sikayet/.test(norm) ? 'complaint' : 'staff_help';
    parsed.needsHuman = true;
  }

  if (parsed.categoryTerms.length && (parsed.includeTerms.length || parsed.excludeTerms.length)) {
    parsed.intent = parsed.excludeTerms.length ? 'allergen_query' : 'ingredient_query';
  }

  return parsed;
}

function isRestaurantRelated(message, menu = []) {
  const norm = normalizeText(message);
  if (!norm) return false;
  if (OFF_TOPIC_PATTERNS.some((p) => p.test(norm))) return false;
  if (RESTAURANT_KEYWORDS.some((kw) => norm.includes(normalizeText(kw)))) return true;
  if (/\d+\s*(kcal|kalori|tl)\b/.test(norm)) return true;
  if (menu.length) {
    const blob = norm;
    if (menu.some((p) => blob.includes(normalizeText(p.name)))) return true;
  }
  return false;
}

function filterProductsByParsedQuery(products, parsedQuery) {
  let list = (products || []).filter((p) => p && p.name);

  list = list.filter((p) => p.inStock !== false);

  if (parsedQuery.categoryTerms?.length) {
    list = list.filter((p) => productMatchesCategory(p, parsedQuery.categoryTerms));
  }

  if (parsedQuery.productName) {
    const pn = normalizeText(parsedQuery.productName);
    list = list.filter((p) => productSearchBlob(p).includes(pn));
  }

  const uncertain = [];

  if (parsedQuery.includeTerms?.length) {
    const next = [];
    for (const p of list) {
      if (productMatchesIncludeTerms(p, parsedQuery.includeTerms)) next.push(p);
      else if (!productHasAllergenData(p)) uncertain.push(p);
    }
    list = next;
  }

  if (parsedQuery.excludeTerms?.length) {
    const next = [];
    for (const p of list) {
      if (!productHasAllergenData(p)) {
        uncertain.push(p);
        continue;
      }
      if (!productMatchesExcludeTerms(p, parsedQuery.excludeTerms)) next.push(p);
    }
    list = next;
  }

  if (parsedQuery.dietTerms?.includes('vegan')) {
    list = list.filter((p) => {
      const b = productSearchBlob(p);
      return !/et\b|tavuk|balik|sut|peynir|yogurt|yumurta/.test(b);
    });
  }

  if (parsedQuery.maxCalories != null) {
    list = list.filter((p) => p.hasApprovedNutrition && p.calories != null && p.calories <= parsedQuery.maxCalories);
  }

  if (parsedQuery.calorieTarget != null) {
    list = list
      .filter((p) => p.hasApprovedNutrition && p.calories != null)
      .sort(
        (a, b) =>
          Math.abs(a.calories - parsedQuery.calorieTarget) -
          Math.abs(b.calories - parsedQuery.calorieTarget)
      );
  }

  if (parsedQuery.minProtein != null) {
    list = list.filter((p) => (p.protein || 0) >= parsedQuery.minProtein);
  }

  if (parsedQuery.maxPrice != null) {
    list = list.filter((p) => {
      const price = p.salePrice != null ? p.salePrice : p.price;
      return price != null && price <= parsedQuery.maxPrice;
    });
  }

  if (parsedQuery.sortBy === 'protein_desc') {
    list = [...list]
      .filter((p) => p.hasApprovedNutrition)
      .sort((a, b) => (b.protein || 0) - (a.protein || 0));
  } else if (parsedQuery.sortBy === 'calories_asc') {
    list = [...list]
      .filter((p) => p.hasApprovedNutrition && p.calories != null)
      .sort((a, b) => a.calories - b.calories);
  } else if (parsedQuery.sortBy === 'price_asc') {
    list = [...list].sort((a, b) => {
      const pa = a.salePrice != null ? a.salePrice : a.price || 0;
      const pb = b.salePrice != null ? b.salePrice : b.price || 0;
      return pa - pb;
    });
  }

  return {
    matched: list.slice(0, 8),
    uncertain: uncertain.slice(0, 5),
  };
}

function buildFilteredProductsReply(parsedQuery, filterResult, message) {
  const { matched, uncertain } = filterResult;
  const warnings = [];
  const norm = normalizeText(message);

  if (!matched.length) {
    let reply = 'Aradığınız kriterlere uygun onaylı ürün bulunamadı.';
    if (parsedQuery.categoryTerms.length) {
      reply = 'Bu kategori ve içerik filtresine uygun onaylı ürün bulunamadı.';
    }
    if (uncertain.length) {
      reply += ' Bazı ürünlerde alerjen/içerik bilgisi eksik olduğu için listelenmedi.';
      warnings.push('incomplete_allergen_data');
    }
    if (parsedQuery.excludeTerms.length || /alerj/.test(norm)) {
      reply += ' Alerjen hassasiyetiniz varsa işletme personeline danışmanız önerilir.';
    }
    return { reply, recommendedProductIds: [], warnings, source: 'rule' };
  }

  const lines = matched.slice(0, 5).map((p) => {
    const kcal = p.calories ? ` — ${p.calories} kcal` : '';
    const price = p.price != null ? ` (${p.salePrice ?? p.price} ₺)` : '';
    return `• ${p.name}${kcal}${price}`;
  });

  let header = 'İşte menümüzden uygun ürünler:';
  if (parsedQuery.categoryTerms.includes('tatli') && parsedQuery.includeTerms.includes('sut')) {
    header = 'Sütlü tatlı seçenekleri:';
  } else if (parsedQuery.categoryTerms.some((t) => ['icecek', 'drink'].includes(t)) && parsedQuery.includeTerms.includes('sut')) {
    header = 'Sütlü içecek seçenekleri:';
  } else if (parsedQuery.excludeTerms.length) {
    header = 'Filtrenize uygun ürünler:';
  } else if (parsedQuery.calorieTarget) {
    header = `${parsedQuery.calorieTarget} kcal hedefine yakın ürünler:`;
  }

  let reply = `${header}\n${lines.join('\n')}`;
  if (uncertain.length) {
    reply += '\nBazı ürünlerde onaylı alerjen/içerik bilgisi eksik; kesin bilgi için personelimize danışın.';
    warnings.push('incomplete_allergen_data');
  }
  if (parsedQuery.excludeTerms.length || /alerj/.test(norm)) {
    reply += '\nAlerjen hassasiyetiniz varsa işletme personeline danışmanız önerilir.';
  }
  if (parsedQuery.dietTerms.length) {
    reply +=
      '\nBu öneriler genel bilgilendirme amaçlıdır; özel diyet veya sağlık durumları için uzman görüşü alınmalıdır.';
    warnings.push('diet_disclaimer');
  }

  return {
    reply,
    recommendedProductIds: matched.slice(0, 5).map((p) => p.id),
    warnings,
    source: 'rule',
    intent: parsedQuery.intent,
  };
}

module.exports = {
  normalizeText,
  parseRestaurantQuery,
  isRestaurantRelated,
  filterProductsByParsedQuery,
  buildFilteredProductsReply,
  productSearchBlob,
  productHasAllergenData,
  CATEGORY_GROUPS,
  TERM_ALIASES,
};
