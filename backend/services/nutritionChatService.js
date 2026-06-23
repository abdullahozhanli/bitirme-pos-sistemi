const mongoose = require('mongoose');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
require('../models/Category');
const { extractJsonFromAiContent } = require('./nutritionEstimateShared');
const Campaign = require('../models/Campaign');
const Order = require('../models/Order');
const parser = require('./restaurantChatParser');

const {
  parseRestaurantQuery,
  filterProductsByParsedQuery,
  buildFilteredProductsReply,
} = parser;

const GEMINI_TIMEOUT_MS = 8000;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const MAX_HISTORY = 4;
const MAX_MENU_ITEMS = 80;
const MENU_CACHE_TTL_MS = 5 * 60 * 1000;

const menuCache = new Map();

const STATIC_REPLIES = {
  greeting:
    'Merhaba. Menüdeki ürünler, kalori bilgileri, alerjenler, kampanyalar ve ürün önerileri konusunda yardımcı olabilirim.',
  thanks:
    'Rica ederim. Başka bir ürünün kalori, içerik veya alerjen bilgisini de sorabilirsin.',
  goodbye: 'Görüşürüz. Afiyet olsun.',
  offTopic:
    'Ben bu sistemde restoran ürünleri, kalori bilgileri, alerjenler, kampanyalar, sepet ve sipariş süreci hakkında yardımcı olabiliyorum.',
  geminiError:
    'Şu anda besin asistanı yanıt veremiyor. Lütfen biraz sonra tekrar deneyin.',
};

const RULE_REPLY_SOURCES = new Set([
  'rule',
  'rule-cart',
  'rule-product',
  'rule-target',
  'rule-light',
  'rule-suggest',
  'rule-allergen',
  'rule-content',
  'rule-based',
]);

/** Türkçe karakterleri normalize eder (süt/sut aynı yakalanır). */
function normalizeText(text) {
  return parser.normalizeText(text);
}

function normalizeTr(text) {
  return normalizeText(text);
}

const ALLERGEN_STAFF_NOTE =
  'Alerjen hassasiyetiniz varsa işletme personeline danışmanız önerilir.';

const CHAT_STOP_WORDS = new Set([
  'kac', 'kadar', 'kalori', 'kcal', 'nedir', 'ne', 'var', 'mi', 'mu', 'icin',
  'oner', 'oneri', 'tavsiye', 'istiyorum', 'lazim', 'almam', 'urun', 'menu', 'menude',
  'menuden', 'bana', 'bir', 've', 'ile', 'yaklasik', 'olan', 'hangi', 'sec',
  'alsam', 'yerim', 'icerir',
]);

const CATEGORY_HINTS = [
  { keys: ['kahve', 'coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'mocha'], cat: 'kahve' },
  { keys: ['cay', 'tea'], cat: 'cay' },
  { keys: ['tatli', 'dessert', 'kek', 'kurabiye'], cat: 'tatli' },
  { keys: ['icecek', 'drink', 'smoothie'], cat: 'icecek' },
];

function resolveGeminiModel() {
  return String(process.env.GEMINI_MODEL || '').trim() || DEFAULT_GEMINI_MODEL;
}

function productHasAllergenData(product) {
  return parser.productHasAllergenData(product);
}

/** Restoran/menü kapsamı dışı mı? */
function isRestaurantRelated(message, menu = []) {
  if (getStaticReply(message)) return true;
  return parser.isRestaurantRelated(message, menu);
}

function shouldApplyProductFilter(parsedQuery) {
  return Boolean(
    parsedQuery.categoryTerms?.length ||
      parsedQuery.includeTerms?.length ||
      parsedQuery.excludeTerms?.length ||
      parsedQuery.calorieTarget != null ||
      parsedQuery.maxCalories != null ||
      parsedQuery.maxPrice != null ||
      parsedQuery.sortBy ||
      parsedQuery.dietTerms?.length
  );
}

function tryParsedQueryReply(message, allMenu) {
  const parsedQuery = parseRestaurantQuery(message);
  if (!shouldApplyProductFilter(parsedQuery)) return null;

  const filterResult = filterProductsByParsedQuery(allMenu, parsedQuery);
  return {
    ...buildFilteredProductsReply(parsedQuery, filterResult, message),
    intent: parsedQuery.intent,
  };
}

async function tryServiceIntentReply({ message, branchId, user, cartItems, allMenu }) {
  const parsed = parseRestaurantQuery(message);
  const norm = normalizeText(message);

  if (parsed.intent === 'cart_analysis' || (norm.includes('sepet') && /kalori|protein|makro|toplam/.test(norm))) {
    return calculateCartNutrition(cartItems, allMenu);
  }

  if (parsed.intent === 'campaign_query') {
    const campaigns = await Campaign.find({
      branchId,
      isActive: true,
    })
      .select('title discountRate campaignType bundlePrice minCartTotal')
      .sort({ sortOrder: 1 })
      .limit(5)
      .lean();

    if (!campaigns.length) {
      return {
        reply: 'Şu anda görüntülenebilir aktif kampanya bulunmuyor.',
        recommendedProductIds: [],
        source: 'rule',
        intent: 'campaign_query',
      };
    }

    const lines = campaigns.map((c) => {
      if (c.campaignType === 'menu' && c.bundlePrice != null) {
        return `• ${c.title}: ${c.bundlePrice} ₺ paket`;
      }
      return `• ${c.title}: %${Math.round((c.discountRate || 0) * 100)} indirim`;
    });
    return {
      reply: `Aktif kampanyalar:\n${lines.join('\n')}`,
      recommendedProductIds: [],
      source: 'rule',
      intent: 'campaign_query',
    };
  }

  if (parsed.intent === 'loyalty_query') {
    if (!user?.id) {
      return {
        reply: 'Sadakat puanınızı görmek için giriş yapmanız gerekir.',
        recommendedProductIds: [],
        source: 'rule',
        intent: 'loyalty_query',
      };
    }
    const points = Number(user.loyaltyPoints) || 0;
    return {
      reply: `Sadakat puanınız: ${points}. Ödeme sırasında puan kullanımı uygulama üzerinden yapılabilir.`,
      recommendedProductIds: [],
      source: 'rule',
      intent: 'loyalty_query',
    };
  }

  if (parsed.intent === 'order_status') {
    if (!user?.id) {
      return {
        reply: 'Sipariş durumunu görmek için giriş yapmanız gerekir.',
        recommendedProductIds: [],
        source: 'rule',
        intent: 'order_status',
      };
    }
    const order = await Order.findOne({
      customer: user.id,
      branchId,
      status: { $nin: ['iptal', 'ödendi', 'tamamlandi'] },
    })
      .sort({ createdAt: -1 })
      .select('status paymentStatus orderItems')
      .lean();

    if (!order) {
      return {
        reply: 'Aktif siparişiniz bulunamadı.',
        recommendedProductIds: [],
        source: 'rule',
        intent: 'order_status',
      };
    }

    const statusMap = {
      hazirlaniyor: 'hazırlanıyor',
      serviste: 'serviste',
      CREATED: 'oluşturuldu',
      SENT_TO_KITCHEN: 'mutfağa iletildi',
      IN_PREP: 'hazırlanıyor',
      READY: 'hazır',
      SERVED: 'servis edildi',
    };
    const label = statusMap[order.status] || order.status;
    return {
      reply: `Son siparişinizin durumu: ${label}. Kesin süre için işletme personeline danışabilirsiniz.`,
      recommendedProductIds: [],
      source: 'rule',
      intent: 'order_status',
    };
  }

  if (parsed.intent === 'payment_help') {
    return {
      reply:
        'Ödeme adımını sepetten tamamlayabilirsiniz. Nakit/kart için kasa veya garson tahsilatı yapılır. ' +
        'Online ödeme demo modundaysa ödeme onayından sonra sipariş iletilir. Sorun devam ederse kasa veya personele başvurun.',
      recommendedProductIds: [],
      source: 'rule',
      intent: 'payment_help',
    };
  }

  if (parsed.intent === 'table_qr_help') {
    return {
      reply:
        'Sipariş oluşturmak için masadaki QR kodu okutmanız gerekir. QR okumuyorsa kamerayı yakınlaştırın veya ışığı artırın. ' +
        'Sorun devam ederse işletme personeline danışın.',
      recommendedProductIds: [],
      source: 'rule',
      intent: 'table_qr_help',
    };
  }

  if (parsed.intent === 'staff_help' || parsed.intent === 'complaint') {
    return {
      reply:
        'Bu durumu işletme personeline iletmeniz önerilir. Garson veya kasa ekibimiz size yardımcı olacaktır.',
      recommendedProductIds: [],
      source: 'rule',
      intent: parsed.intent,
      needsHuman: true,
    };
  }

  return null;
}

function calculateCartNutrition(cartItems, menu) {
  return buildCartReply(cartItems, menu);
}

function buildGeminiSystemInstruction(branchName) {
  return (
    'Sen Self Kasa mobil uygulaması içinde çalışan restoran odaklı yapay zekâ asistanısın.\n\n' +
    'Görevin:\n' +
    '- Menü ürünleri hakkında bilgi vermek\n' +
    '- Kalori, protein, karbonhidrat, yağ ve alerjen bilgilerini açıklamak\n' +
    '- Kullanıcının isteğine göre ürün önermek\n' +
    '- Kategori, içerik ve alerjen filtrelerini dikkate almak\n' +
    '- Sepet toplam besin değerlerini yorumlamak\n' +
    '- Kampanya, sadakat puanı, ödeme, QR ve sipariş süreci hakkında yardımcı olmak\n\n' +
    'Kurallar:\n' +
    '- Sadece backend tarafından verilen gerçek ürün listesine göre cevap ver.\n' +
    '- Ürün, fiyat, kalori, kampanya veya stok bilgisi uydurma.\n' +
    '- Verilen ürün listesi boşsa ürün varmış gibi davranma.\n' +
    "- Onaylı besin değeri yoksa 'Bu ürün için onaylı besin değeri bulunmuyor.' de.\n" +
    '- Alerjen konusunda kesin bilgi yoksa kesin konuşma.\n' +
    '- Alerjen hassasiyeti varsa kullanıcıyı işletme personeline yönlendir.\n' +
    '- Sağlık, hastalık veya özel diyet konusunda doktor/diyetisyen gibi kesin tavsiye verme.\n' +
    '- Cevapları kısa, net ve Türkçe ver.\n' +
    '- En fazla 3-5 ürün öner.\n' +
    `- Çalıştığın işletme: "${branchName}".\n` +
    'Yanıtı YALNIZCA JSON ver: {"reply":"string","recommendedProductIds":["mongoId"]}'
  );
}

/** Selam, teşekkür, veda — Gemini çağrılmaz. */
function getStaticReply(message) {
  const norm = normalizeTr(message).trim();
  if (!norm) return null;

  const wordCount = norm.split(/\s+/).filter(Boolean).length;

  const isThanks =
    /\b(tesekkur|tesekur|sagol|eyvallah|tsk|tks)\b/.test(norm) ||
    norm.startsWith('cok tesekkur') ||
    norm.startsWith('cok sagol') ||
    norm.includes('tesekkur ederim');
  if (isThanks) {
    return { reply: STATIC_REPLIES.thanks, source: 'static' };
  }

  const isGoodbye =
    wordCount <= 5 &&
    (/^(gorusuruz|bay bay|iyi aksamlar|sonra gorusuruz|hosca kal|bay|bye)\b/.test(norm) ||
      norm === 'iyi aksamlar');
  if (isGoodbye) {
    return { reply: STATIC_REPLIES.goodbye, source: 'static' };
  }

  const isGreeting =
    wordCount <= 5 &&
    (/^(selam|merhaba|sa|hey|iyi gunler|iyi aksamlar|selamlar|gunaydin|hello|hi)\b/.test(norm) ||
      norm === 'sa');
  if (isGreeting) {
    return { reply: STATIC_REPLIES.greeting, source: 'static' };
  }

  return null;
}

function messageTokens(message) {
  return normalizeTr(message)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !CHAT_STOP_WORDS.has(t));
}

function looksLikeCalorieQuestion(message) {
  const norm = normalizeTr(message);
  return (
    norm.includes('kalori') ||
    norm.includes('kcal') ||
    norm.includes('kalorilik') ||
    norm.includes('kac') ||
    norm.includes('besin')
  );
}

function looksLikeAllergenQuestion(message) {
  const norm = normalizeText(message);
  const parsed = parseRestaurantQuery(message);
  return (
    parsed.includeTerms?.length > 0 ||
    parsed.excludeTerms?.length > 0 ||
    norm.includes('alerjen') ||
    norm.includes('alerji') ||
    norm.includes('gluten') ||
    norm.includes('laktoz') ||
    norm.includes('fistik') ||
    norm.includes('findik') ||
    norm.includes('yiyebilir miyim')
  );
}

function rankProductsForMessage(message, menu) {
  const tokens = messageTokens(message);
  const norm = normalizeTr(message);

  return menu
    .map((p) => {
      const nameNorm = normalizeTr(p.name);
      const catNorm = normalizeTr(p.category || '');
      let score = 0;

      if (nameNorm && norm.includes(nameNorm)) score += nameNorm.length + 12;

      for (const t of tokens) {
        if (nameNorm.includes(t)) score += t.length + 3;
        const nameParts = nameNorm.split(/\s+/);
        if (nameParts.some((w) => w.startsWith(t) || t.startsWith(w))) score += 2;
        if (catNorm.includes(t)) score += 2;
      }

      for (const hint of CATEGORY_HINTS) {
        if (hint.keys.some((k) => norm.includes(normalizeTr(k)))) {
          if (catNorm.includes(hint.cat) || hint.keys.some((k) => nameNorm.includes(normalizeTr(k)))) {
            score += 5;
          }
        }
      }

      return { p, score };
    })
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score);
}

function findProductsInMessage(message, menu) {
  return rankProductsForMessage(message, menu).map((x) => x.p);
}

function toAiProductItem(doc) {
  const category =
    doc?.category?.name ||
    (typeof doc?.category === 'string' ? doc.category : '') ||
    '';
  const n = doc?.nutrition || {};
  const hasApprovedNutrition =
    doc?.nutritionStatus === 'approved' &&
    n?.isNutritionVisibleToCustomer === true &&
    Number(n?.calories) > 0;

  const stock = Number(doc?.countInStock);
  const inStock = Number.isFinite(stock) ? stock > 0 : true;

  return {
    id: String(doc._id),
    name: String(doc.name || '').trim(),
    category,
    price: Number(doc.price) || 0,
    salePrice: doc.salePrice != null ? Number(doc.salePrice) : null,
    station: doc.station || 'hot',
    countInStock: Number.isFinite(stock) ? stock : null,
    inStock,
    isFeatured: !!doc.isFeatured,
    nutritionStatus: doc.nutritionStatus || 'none',
    isNutritionVisibleToCustomer: !!n.isNutritionVisibleToCustomer,
    hasApprovedNutrition,
    calories: hasApprovedNutrition ? Math.round(Number(n.calories)) : null,
    protein: hasApprovedNutrition ? Number(n.protein) || 0 : null,
    carbs: hasApprovedNutrition ? Number(n.carbs) || 0 : null,
    fat: hasApprovedNutrition ? Number(n.fat) || 0 : null,
    servingGram: hasApprovedNutrition ? Number(n.servingGram) || null : null,
    portionUnit: hasApprovedNutrition ? n.portionUnit || '' : '',
    allergens: Array.isArray(n.allergens) ? n.allergens : [],
    ingredients: Array.isArray(n.ingredients) ? n.ingredients : [],
  };
}

/** Müşteriye görünür ürünleri AI bağlamı için yükler. */
async function getVisibleProductsForAI(branchId) {
  const cacheKey = String(branchId);
  const cached = menuCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MENU_CACHE_TTL_MS) {
    return cached.menu;
  }

  const products = await Product.find({
    branchId,
    isVisibleToCustomer: { $ne: false },
  })
    .populate('category', 'name')
    .select(
      'name category nutrition price salePrice station countInStock isFeatured nutritionStatus'
    )
    .sort({ name: 1 })
    .limit(MAX_MENU_ITEMS)
    .lean();

  const menu = products.map(toAiProductItem).filter((p) => p.name);
  menuCache.set(cacheKey, { at: Date.now(), menu });
  return menu;
}

/** Öneri ve kalori hesabı için onaylı + stokta ürünler. */
function getRecommendableMenu(menu) {
  return menu.filter((p) => p.hasApprovedNutrition && p.inStock);
}

/** Geriye dönük uyumluluk. */
async function loadBranchMenu(branchId) {
  const menu = await getVisibleProductsForAI(branchId);
  return getRecommendableMenu(menu);
}

function buildGeminiPrompt(branchName, products, cartItems = [], parsedQuery = null) {
  const productContext = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? undefined,
    category: p.category || undefined,
    station: p.station,
    inStock: p.inStock,
    stock: p.countInStock,
    nutritionStatus: p.nutritionStatus,
    isNutritionVisibleToCustomer: p.isNutritionVisibleToCustomer,
    calories: p.calories,
    protein: p.protein,
    carbs: p.carbs,
    fat: p.fat,
    allergens: p.allergens?.length ? p.allergens : undefined,
    ingredients: p.ingredients?.length ? p.ingredients : undefined,
    isFeatured: p.isFeatured || undefined,
  }));

  let systemInstruction = buildGeminiSystemInstruction(branchName);
  systemInstruction += `\n\nÜrün listesi JSON:\n${JSON.stringify(productContext)}`;
  if (parsedQuery) {
    systemInstruction += `\n\nKullanıcı filtresi:\n${JSON.stringify({
      intent: parsedQuery.intent,
      categoryTerms: parsedQuery.categoryTerms,
      includeTerms: parsedQuery.includeTerms,
      excludeTerms: parsedQuery.excludeTerms,
      calorieTarget: parsedQuery.calorieTarget,
      maxCalories: parsedQuery.maxCalories,
      sortBy: parsedQuery.sortBy,
    })}`;
  }

  const cartNote =
    cartItems.length > 0
      ? `\n\nMüşteri sepeti:\n${JSON.stringify(cartItems)}`
      : '';

  return { systemInstruction, cartNote };
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY)
    .map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      content: String(item?.content || '').trim().slice(0, 800),
    }))
    .filter((item) => item.content);
}

function sanitizeCartItems(cartItems) {
  if (!Array.isArray(cartItems)) return [];
  return cartItems
    .slice(0, 20)
    .map((item) => ({
      productId: String(item?.productId || item?._id || '').trim(),
      name: String(item?.name || '').trim().slice(0, 120),
      qty: Math.min(20, Math.max(1, Math.round(Number(item?.qty) || 1))),
      calories: Number(item?.calories) > 0 ? Math.round(Number(item.calories)) : null,
      protein: Number(item?.protein) > 0 ? Math.round(Number(item.protein)) : null,
      carbs: Number(item?.carbs) > 0 ? Math.round(Number(item.carbs)) : null,
      fat: Number(item?.fat) > 0 ? Math.round(Number(item.fat)) : null,
    }))
    .filter((item) => item.name);
}

function parseTargetCalories(message) {
  const withUnit = String(message || '').match(/(\d{2,4})\s*(?:kcal|kalori(?:lik)?|kal)\b/i);
  if (withUnit) {
    const n = Number(withUnit[1]);
    if (Number.isFinite(n) && n >= 50 && n <= 5000) return n;
  }
  const norm = normalizeTr(message);
  if (
    norm.includes('kalori') ||
    norm.includes('kcal') ||
    norm.includes('kalorilik') ||
    norm.includes('oner') ||
    norm.includes('lazim') ||
    norm.includes('ihtiyac') ||
    norm.includes('doldur') ||
    norm.includes('tamamla') ||
    norm.includes('yiyebilir')
  ) {
    const plain = String(message || '').match(/\b(\d{2,4})\b/);
    if (plain) {
      const n = Number(plain[1]);
      if (Number.isFinite(n) && n >= 50 && n <= 5000) return n;
    }
  }
  return null;
}

function parseTargetCaloriesFromHistory(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.role !== 'user') continue;
    const content = history[i]?.content || history[i]?.text || '';
    const target = parseTargetCalories(content);
    if (target) return target;
  }
  return null;
}

function parseRequestedProductCount(message) {
  const norm = normalizeTr(message);
  const rangeMatch = norm.match(/\b([2-5])\s*(?:yada|veya|ile|or|\/|-)\s*([2-5])\s*urun/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.max(a, b);
  }

  const digitMatch = norm.match(/\b([2-5])\s*urun(?:le|lu|ler|den|de|u|uyle|lerle)?\b/);
  if (digitMatch) {
    const n = Number(digitMatch[1]);
    if (Number.isFinite(n) && n >= 2 && n <= 5) return n;
  }

  if (
    (norm.includes('doldur') || norm.includes('tamamla') || norm.includes('karsila')) &&
    (norm.includes('hangi') || norm.includes('urun'))
  ) {
    return 3;
  }

  return null;
}

function parseProductCountRange(message) {
  const norm = normalizeTr(message);
  const rangeMatch = norm.match(/\b([2-5])\s*(?:yada|veya|ile|or|\/|-)\s*([2-5])\s*urun/);
  if (!rangeMatch) return null;
  const a = Number(rangeMatch[1]);
  const b = Number(rangeMatch[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

function parseRequestedProductCountFromHistory(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.role !== 'user') continue;
    const count = parseRequestedProductCount(history[i]?.content || history[i]?.text || '');
    if (count) return count;
  }
  return null;
}

function parseProductCountRangeFromHistory(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.role !== 'user') continue;
    const range = parseProductCountRange(history[i]?.content || history[i]?.text || '');
    if (range) return range;
  }
  return null;
}

function isComboCorrectionMessage(message) {
  const norm = normalizeTr(message);
  return (
    (norm.includes('ama') || norm.includes('istedim') || norm.includes('dedim')) &&
    (norm.includes('urun') || /\b[2-5]\b/.test(norm))
  );
}

function resolveComboCount(message, target, history = []) {
  const range = parseProductCountRange(message) || parseProductCountRangeFromHistory(history);
  const requested =
    parseRequestedProductCount(message) ||
    parseRequestedProductCountFromHistory(history);

  if (requested) return Math.min(requested, 5);
  if (range) return range.max;
  if (target >= 1800) return 4;
  if (target >= 1500) return 3;
  if (target >= 900) return 2;
  return 1;
}

function resolveComboIntent(message, history = []) {
  let target = parseTargetCalories(message);
  if (
    !target &&
    (isComboCorrectionMessage(message) ||
      parseRequestedProductCount(message) ||
      parseProductCountRange(message))
  ) {
    target = parseTargetCaloriesFromHistory(history);
  }
  if (!target) return null;

  const range =
    parseProductCountRange(message) ||
    parseProductCountRangeFromHistory(history);
  const count = resolveComboCount(message, target, history);

  return { target, count, range };
}

function suggestComboForTarget(target, menu, count = 1) {
  if (!menu.length || count < 1) return [];

  const sorted = [...menu].sort((a, b) => a.calories - b.calories);
  const pickCount = Math.min(count, sorted.length);

  if (pickCount === 1) {
    let best = sorted[0];
    let bestDiff = Math.abs(best.calories - target);
    for (const item of sorted) {
      const diff = Math.abs(item.calories - target);
      if (diff < bestDiff) {
        best = item;
        bestDiff = diff;
      }
    }
    return [best];
  }

  let bestCombo = null;
  let bestDiff = Infinity;
  const picked = [];

  function search(start, remaining) {
    if (remaining === 0) {
      const sum = picked.reduce((acc, item) => acc + item.calories, 0);
      const diff = Math.abs(sum - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestCombo = picked.map((item) => item);
      }
      return;
    }
    for (let i = start; i <= sorted.length - remaining; i += 1) {
      picked.push(sorted[i]);
      search(i + 1, remaining - 1);
      picked.pop();
    }
  }

  search(0, pickCount);
  return bestCombo || [sorted[0]];
}

function suggestBestComboForTarget(target, menu, count, range = null) {
  const counts = [];
  if (range && range.min <= range.max) {
    for (let c = range.min; c <= range.max; c += 1) counts.push(c);
  } else if (count) {
    counts.push(count);
  } else {
    counts.push(1);
  }

  let best = null;
  let bestDiff = Infinity;

  for (const pickCount of counts) {
    const picks = suggestComboForTarget(target, menu, pickCount);
    if (!picks.length) continue;
    const sum = picks.reduce((acc, item) => acc + item.calories, 0);
    const diff = Math.abs(sum - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = { picks, sum, count: picks.length };
    }
  }

  return best;
}

function buildTargetComboReply(target, menu, message, history = []) {
  const range =
    parseProductCountRange(message) ||
    parseProductCountRangeFromHistory(history);
  const count = resolveComboCount(message, target, history);
  const best = suggestBestComboForTarget(target, menu, count, range);
  if (!best?.picks?.length) return null;

  const { picks, sum } = best;
  const lines = picks.map((p) => `• ${p.name}: ${p.calories} kcal`).join('\n');
  const countLabel = picks.length === 1 ? 'ürün' : `${picks.length} ürün`;

  return {
    reply:
      `${target} kcal hedefine yakın ${countLabel} önerim (~${sum} kcal):\n` +
      `${lines}\n` +
      'Değerler porsiyon başına menü bilgisidir.',
    recommendedProductIds: picks.map((p) => p.id),
    source: 'rule-target',
  };
}

function buildProductCalorieReply(product) {
  if (!product.hasApprovedNutrition) {
    return {
      reply: 'Bu ürün için onaylı besin değeri bulunmuyor.',
      recommendedProductIds: [product.id],
      source: 'rule-product',
    };
  }

  let reply = `${product.name} yaklaşık ${product.calories} kcal`;
  const macros = [];
  if (product.protein) macros.push(`protein: ${Math.round(product.protein)} g`);
  if (product.carbs) macros.push(`karbonhidrat: ${Math.round(product.carbs)} g`);
  if (product.fat) macros.push(`yağ: ${Math.round(product.fat)} g`);
  if (macros.length) reply += ` (${macros.join(', ')})`;
  reply += '. Bu değerler porsiyon başına onaylı menü bilgisidir.';

  return {
    reply,
    recommendedProductIds: [product.id],
    source: 'rule-product',
  };
}

function buildAllergenReply(product) {
  if (!product.hasApprovedNutrition && !product.allergens?.length) {
    return {
      reply:
        `${product.name} için onaylı alerjen bilgisi bulunmuyor. ` +
        'Alerjen hassasiyetiniz varsa işletme personeline danışmanız önerilir.',
      recommendedProductIds: [product.id],
      source: 'rule-allergen',
    };
  }

  if (product.allergens?.length) {
    return {
      reply:
        `${product.name} alerjen bilgisi: ${product.allergens.join(', ')}. ` +
        'Alerjen hassasiyetiniz varsa işletme personeline danışmanız önerilir.',
      recommendedProductIds: [product.id],
      source: 'rule-allergen',
    };
  }

  return {
    reply:
      `${product.name} için kayıtlı alerjen bilgisi yok. ` +
      'Alerjen hassasiyetiniz varsa işletme personeline danışmanız önerilir.',
    recommendedProductIds: [product.id],
    source: 'rule-allergen',
  };
}

function buildCartReply(cartItems, menu) {
  if (!cartItems.length) {
    return {
      reply: 'Sepetiniz boş görünüyor. Menüden ürün ekledikten sonra tekrar sorabilirsiniz.',
      recommendedProductIds: [],
      source: 'rule-cart',
    };
  }

  const menuById = new Map(menu.map((m) => [m.id, m]));
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  const lines = [];
  let missingNutrition = false;

  for (const item of cartItems) {
    const fromMenu = menuById.get(item.productId);
    const kcal = fromMenu?.calories ?? item.calories ?? null;
    const protein = fromMenu?.protein ?? item.protein ?? null;
    const carbs = fromMenu?.carbs ?? item.carbs ?? null;
    const fat = fromMenu?.fat ?? item.fat ?? null;
    const qty = item.qty || 1;

    if (kcal != null && kcal > 0) {
      totalKcal += kcal * qty;
      lines.push(`${item.name} x${qty}: ~${kcal * qty} kcal`);
    } else {
      missingNutrition = true;
      lines.push(`${item.name} x${qty}: onaylı kalori bilgisi yok`);
    }

    if (protein) totalProtein += protein * qty;
    if (carbs) totalCarbs += carbs * qty;
    if (fat) totalFat += fat * qty;
  }

  let reply = `Sepetinizin tahmini toplamı: ~${totalKcal} kcal`;
  const macroParts = [];
  if (totalProtein) macroParts.push(`protein ~${Math.round(totalProtein)} g`);
  if (totalCarbs) macroParts.push(`karbonhidrat ~${Math.round(totalCarbs)} g`);
  if (totalFat) macroParts.push(`yağ ~${Math.round(totalFat)} g`);
  if (macroParts.length) reply += ` (${macroParts.join(', ')})`;
  reply += '.\n' + lines.map((l) => `• ${l}`).join('\n');
  if (missingNutrition) {
    reply += '\nBazı ürünlerde onaylı besin değeri bulunmuyor.';
  }

  return {
    reply,
    recommendedProductIds: [],
    source: 'rule-cart',
  };
}

/** Gemini çağrılmadan önce kural tabanlı hızlı yanıtlar. */
function tryRuleBasedReply({ message, allMenu, recommendMenu, cartItems, history = [] }) {
  const norm = normalizeText(message);

  if (
    norm.includes('sepet') &&
    (norm.includes('kac') || norm.includes('kalori') || norm.includes('toplam') || norm.includes('analiz'))
  ) {
    return buildCartReply(cartItems, allMenu);
  }

  const matchedAll = findProductsInMessage(message, allMenu);
  const isSingleProductAllergenQuestion =
    matchedAll.length === 1 &&
    (norm.includes('yiyebilir') || norm.includes('yer miyim') || /\bbu\b/.test(norm));

  if (looksLikeAllergenQuestion(message) && isSingleProductAllergenQuestion) {
    return buildAllergenReply(matchedAll[0]);
  }

  const comboIntent = resolveComboIntent(message, history);
  if (comboIntent?.target) {
    const comboReply = buildTargetComboReply(
      comboIntent.target,
      recommendMenu,
      message,
      history
    );
    if (comboReply) return comboReply;
  }

  if (looksLikeAllergenQuestion(message) && matchedAll.length >= 1) {
    return buildAllergenReply(matchedAll[0]);
  }

  if (matchedAll.length === 1) {
    return buildProductCalorieReply(matchedAll[0]);
  }

  if (matchedAll.length > 1) {
    const lines = matchedAll.slice(0, 5).map((p) => {
      if (!p.hasApprovedNutrition) return `• ${p.name}: onaylı besin değeri yok`;
      return `• ${p.name}: ${p.calories} kcal`;
    });
    return {
      reply: `Şunları buldum:\n${lines.join('\n')}`,
      recommendedProductIds: matchedAll.slice(0, 3).map((p) => p.id),
      source: 'rule-product',
    };
  }

  if (norm.includes('protein') && (norm.includes('var') || norm.includes('oner') || norm.includes('yuksek'))) {
    const picks = [...recommendMenu]
      .sort((a, b) => (b.protein || 0) - (a.protein || 0))
      .slice(0, 4);
    if (picks.length) {
      return {
        reply:
          'Protein açısından öne çıkan ürünler:\n' +
          picks.map((p) => `• ${p.name}: ${p.calories} kcal, protein ${Math.round(p.protein || 0)} g`).join('\n'),
        recommendedProductIds: picks.map((p) => p.id),
        source: 'rule-suggest',
      };
    }
  }

  if (norm.includes('dusuk') || norm.includes('hafif') || norm.includes('diyet')) {
    const light = [...recommendMenu].sort((a, b) => a.calories - b.calories).slice(0, 4);
    if (light.length) {
      return {
        reply:
          'Daha hafif seçenekler:\n' +
          light.map((p) => `• ${p.name}: ${p.calories} kcal`).join('\n'),
        recommendedProductIds: light.map((p) => p.id),
        source: 'rule-light',
      };
    }
  }

  if (
    norm.includes('oner') ||
    norm.includes('tavsiye') ||
    norm.includes('ne yesem') ||
    norm.includes('ne alsem') ||
    norm.includes('ne alayim') ||
    norm.includes('yiyebilir')
  ) {
    const target = parseTargetCalories(message);
    if (target) {
      const comboReply = buildTargetComboReply(target, recommendMenu, message, history);
      if (comboReply) return comboReply;
    }

    const picks = [...recommendMenu].sort((a, b) => a.calories - b.calories).slice(0, 4);
    if (picks.length) {
      return {
        reply:
          'Menümüzden birkaç öneri:\n' +
          picks.map((p) => `• ${p.name}: ${p.calories} kcal`).join('\n'),
        recommendedProductIds: picks.map((p) => p.id),
        source: 'rule-suggest',
      };
    }
  }

  if (looksLikeCalorieQuestion(message)) {
    const ranked = rankProductsForMessage(message, allMenu);
    if (ranked.length === 1) {
      return buildProductCalorieReply(ranked[0].p);
    }
    if (ranked.length > 1) {
      const top = ranked.slice(0, 4).map((x) => x.p);
      return {
        reply:
          'Şunları buldum:\n' +
          top
            .map((p) =>
              p.hasApprovedNutrition
                ? `• ${p.name}: ${p.calories} kcal`
                : `• ${p.name}: onaylı besin değeri yok`
            )
            .join('\n'),
        recommendedProductIds: top.slice(0, 3).map((p) => p.id),
        source: 'rule-product',
      };
    }
  }

  return null;
}

function parseChatAiResponse(raw, menu) {
  const parsed = extractJsonFromAiContent(raw);
  const reply = String(parsed?.reply || '').trim();
  const ids = Array.isArray(parsed?.recommendedProductIds)
    ? parsed.recommendedProductIds.map((id) => String(id)).filter(Boolean)
    : [];
  const validIds = new Set(menu.map((m) => m.id));
  const recommendedProductIds = ids.filter((id) => validIds.has(id)).slice(0, 5);

  if (!reply) return null;
  return { reply: reply.slice(0, 2000), recommendedProductIds };
}

async function askGeminiNutritionChat({
  branchName,
  menu,
  message,
  history,
  cartItems,
  parsedQuery = null,
}) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return { error: 'no_key' };

  const { systemInstruction, cartNote } = buildGeminiPrompt(
    branchName,
    menu,
    cartItems,
    parsedQuery
  );

  const contents = [];
  for (const turn of history) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: `${message}${cartNote}` }],
  });

  const model = resolveGeminiModel();
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          maxOutputTokens: 320,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') return { error: 'timeout' };
    return { error: 'network' };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) return { error: 'api' };

  let data;
  try {
    data = await response.json();
  } catch (_) {
    return { error: 'parse' };
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p?.text || '').join('') : '';
  const parsed = parseChatAiResponse(text, menu);
  if (!parsed) return { error: 'invalid_response' };
  return { ...parsed, source: 'gemini' };
}

async function askOpenAINutritionChat({
  branchName,
  menu,
  message,
  history,
  cartItems,
  parsedQuery = null,
}) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return { error: 'no_key' };

  const { systemInstruction, cartNote } = buildGeminiPrompt(
    branchName,
    menu,
    cartItems,
    parsedQuery
  );
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    })),
    { role: 'user', content: `${message}${cartNote}` },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        response_format: { type: 'json_object' },
        messages,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') return { error: 'timeout' };
    return { error: 'network' };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) return { error: 'api' };

  let data;
  try {
    data = await response.json();
  } catch (_) {
    return { error: 'parse' };
  }

  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = parseChatAiResponse(text, menu);
  if (!parsed) return { error: 'invalid_response' };
  return { ...parsed, source: 'openai' };
}

function mapRecommendedProducts(menu, ids) {
  const byId = new Map(menu.map((m) => [m.id, m]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      calories: p.calories,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
    }));
}

function shouldUseGemini() {
  if (String(process.env.NUTRITION_CHAT_USE_AI || 'true').toLowerCase() === 'false') {
    return false;
  }
  return true;
}

function formatChatResponse(result, menu) {
  const response = {
    reply: result.reply,
    products: mapRecommendedProducts(menu, result.recommendedProductIds || []),
    source: result.source || 'rule',
  };
  if (result.intent) response.intent = result.intent;
  if (result.warnings?.length) response.warnings = result.warnings;
  return response;
}

async function handleNutritionChat({
  branchId,
  message,
  history = [],
  cartItems = [],
  user = null,
}) {
  const text = String(message || '').trim();
  if (!text) {
    const err = new Error('Mesaj boş olamaz.');
    err.statusCode = 400;
    throw err;
  }
  if (text.length > 600) {
    const err = new Error('Mesaj en fazla 600 karakter olabilir.');
    err.statusCode = 400;
    throw err;
  }
  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
    const err = new Error('Geçerli bir şube (QR) oturumu gerekli.');
    err.statusCode = 400;
    throw err;
  }

  const [branch, allMenu] = await Promise.all([
    Branch.findById(branchId).select('name').lean(),
    getVisibleProductsForAI(branchId),
  ]);

  const branchName = branch?.name || 'Restoran';
  const safeHistory = sanitizeHistory(history);
  const safeCart = sanitizeCartItems(cartItems);
  const recommendMenu = getRecommendableMenu(allMenu);

  const staticReply = getStaticReply(text);
  if (staticReply) {
    return formatChatResponse(
      { ...staticReply, recommendedProductIds: [] },
      allMenu
    );
  }

  if (!isRestaurantRelated(text, allMenu)) {
    return formatChatResponse(
      { reply: STATIC_REPLIES.offTopic, recommendedProductIds: [], source: 'rule' },
      allMenu
    );
  }

  if (!allMenu.length) {
    return formatChatResponse(
      {
        reply:
          'Bu şubede henüz müşterilere açık ürün bulunmuyor. ' +
          'Yöneticiniz menüyü yayınladığında buradan öneri alabilirsiniz.',
        recommendedProductIds: [],
        source: 'rule',
      },
      allMenu
    );
  }

  const parsedQuery = parseRestaurantQuery(text);

  const serviceReply = await tryServiceIntentReply({
    message: text,
    branchId,
    user,
    cartItems: safeCart,
    allMenu,
  });
  if (serviceReply) {
    return formatChatResponse(serviceReply, allMenu);
  }

  const parsedReply = tryParsedQueryReply(text, allMenu);
  if (parsedReply) {
    return formatChatResponse(parsedReply, allMenu);
  }

  const ruleReply = tryRuleBasedReply({
    message: text,
    allMenu,
    recommendMenu,
    cartItems: safeCart,
    history: safeHistory,
  });

  if (ruleReply && RULE_REPLY_SOURCES.has(ruleReply.source)) {
    return formatChatResponse(ruleReply, allMenu);
  }

  let aiAttempted = false;
  let result = null;
  const filterResult = filterProductsByParsedQuery(allMenu, parsedQuery);
  const geminiMenu =
    filterResult.matched.length > 0 ? filterResult.matched : recommendMenu;

  if (shouldUseGemini()) {
    aiAttempted = true;
    result = await askGeminiNutritionChat({
      branchName,
      menu: geminiMenu,
      message: text,
      history: safeHistory,
      cartItems: safeCart,
      parsedQuery,
    });
    if (result && !result.error) {
      return formatChatResponse(result, allMenu);
    }
  }

  if (!result || result.error) {
    aiAttempted = true;
    const openAiResult = await askOpenAINutritionChat({
      branchName,
      menu: geminiMenu,
      message: text,
      history: safeHistory,
      cartItems: safeCart,
      parsedQuery,
    });
    if (openAiResult && !openAiResult.error) {
      return formatChatResponse(openAiResult, allMenu);
    }
  }

  if (aiAttempted) {
    if (ruleReply) {
      return formatChatResponse(ruleReply, allMenu);
    }
    return formatChatResponse(
      { reply: STATIC_REPLIES.geminiError, recommendedProductIds: [], source: 'rule' },
      allMenu
    );
  }

  if (ruleReply) {
    return formatChatResponse(ruleReply, allMenu);
  }

  return formatChatResponse(
    {
      reply:
        'Menümüzdeki bir ürünün adını yazarak kalori veya alerjen bilgisini sorabilirsin. ' +
        'Örnek: "Latte kaç kalori?" veya "180 kalorilik ne yiyebilirim?"',
      recommendedProductIds: [],
      source: 'rule-based',
    },
    allMenu
  );
}

async function handleRestaurantChatMessage(req, res, next) {
  try {
    const body = req.body || {};
    const result = await handleNutritionChat({
      branchId: body.branchId,
      message: body.message,
      history: body.history,
      cartItems: body.cartItems || body.basket || body.cart || [],
      user: req.user || null,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[calorie/chat]', error?.message || error);
    }
    if (error?.name === 'AbortError') {
      return res.status(504).json({ message: 'AI yanıt süresi aşıldı. Tekrar deneyin.' });
    }
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
}

module.exports = {
  handleNutritionChat,
  handleRestaurantChatMessage,
  loadBranchMenu,
  getVisibleProductsForAI,
  getStaticReply,
  isRestaurantRelated,
  buildGeminiPrompt,
  buildGeminiSystemInstruction,
  tryRuleBasedReply,
  tryParsedQueryReply,
  parseRestaurantQuery,
  filterProductsByParsedQuery,
  calculateCartNutrition,
  normalizeText,
  STATIC_REPLIES,
};
