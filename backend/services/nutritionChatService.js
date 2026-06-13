const mongoose = require('mongoose');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
require('../models/Category');
const { extractJsonFromAiContent } = require('./nutritionEstimateShared');

const GEMINI_TIMEOUT_MS = 8000;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const MAX_HISTORY = 4;
const MAX_MENU_ITEMS = 60;
const MENU_CACHE_TTL_MS = 5 * 60 * 1000;

const menuCache = new Map();

const CHAT_STOP_WORDS = new Set([
  'kac', 'kadar', 'kalori', 'kcal', 'nedir', 'ne', 'var', 'mi', 'mı', 'mu', 'icin',
  'oner', 'oneri', 'tavsiye', 'istiyorum', 'lazim', 'almam', 'urun', 'menu', 'menude',
  'menuden', 'bana', 'bir', 've', 'ile', 'kac', 'kaç', 'yaklasik', 'yaklaşık', 'kadar',
  'olan', 'hangi', 'sec', 'seç', 'alsam', 'yerim', 'içerir', 'icerir',
]);

const CATEGORY_HINTS = [
  { keys: ['kahve', 'coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'mocha'], cat: 'kahve' },
  { keys: ['cay', 'çay', 'tea'], cat: 'cay' },
  { keys: ['tatli', 'tatlı', 'dessert', 'kek', 'kurabiye'], cat: 'tatli' },
  { keys: ['icecek', 'içecek', 'drink', 'smoothie'], cat: 'icecek' },
];

function normalizeTr(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function resolveGeminiModel() {
  return String(process.env.GEMINI_MODEL || '').trim() || DEFAULT_GEMINI_MODEL;
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
    norm.includes('kac') ||
    norm.includes('kaç') ||
    norm.includes('besin')
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

function buildChatSystemPrompt(branchName, menuItems) {
  const slimMenu = menuItems.map((p) => ({
    id: p.id,
    name: p.name,
    kcal: p.calories,
    cat: p.category || undefined,
  }));
  const menuJson = JSON.stringify(slimMenu);
  return (
    `Sen "${branchName}" restoranının AI Kalori Asistanısın. ` +
    'Yalnızca aşağıdaki menü listesindeki ürünler hakkında konuş. ' +
    'Menüde olmayan ürün için tahmin yapma; nazikçe menümüzde bulunmadığını söyle. ' +
    'Kalori ve besin değerlerini menüdeki sayılardan kullan; uydurma. ' +
    'Müşteri kalori hedefi söylediğinde menüden 1-3 ürün veya mantıklı bir kombinasyon öner; toplam kaloriyi hesapla. ' +
    'Sepet bilgisi verilmişse sepet toplam kalorisini hesapla ve kısaca açıkla. ' +
    'Kısa, samimi, Türkçe yanıt ver. Tıbbi tavsiye verme. ' +
    'Yanıtı YALNIZCA JSON ver, başka metin ekleme: ' +
    '{"reply":"string","recommendedProductIds":["mongoId"]}. ' +
    'Öneri yoksa recommendedProductIds boş dizi olsun. ' +
    `Menü JSON:\n${menuJson}`
  );
}

function toMenuItem(doc) {
  const category =
    doc?.category?.name ||
    (typeof doc?.category === 'string' ? doc.category : '') ||
    '';
  const n = doc?.nutrition || {};
  return {
    id: String(doc._id),
    name: String(doc.name || '').trim(),
    category,
    calories: Math.round(Number(n.calories) || 0),
    protein: Number(n.protein) || 0,
    carbs: Number(n.carbs) || 0,
    fat: Number(n.fat) || 0,
    servingGram: Number(n.servingGram) || null,
    portionUnit: n.portionUnit || '',
  };
}

async function loadBranchMenu(branchId) {
  const cacheKey = String(branchId);
  const cached = menuCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MENU_CACHE_TTL_MS) {
    return cached.menu;
  }

  const products = await Product.find({
    branchId,
    isVisibleToCustomer: { $ne: false },
    nutritionStatus: 'approved',
    'nutrition.isNutritionVisibleToCustomer': true,
    'nutrition.calories': { $gt: 0 },
  })
    .populate('category', 'name')
    .select('name category nutrition price')
    .sort({ name: 1 })
    .limit(MAX_MENU_ITEMS)
    .lean();

  const menu = products.map(toMenuItem).filter((p) => p.name && p.calories > 0);
  menuCache.set(cacheKey, { at: Date.now(), menu });
  return menu;
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
    }))
    .filter((item) => item.name);
}

function parseTargetCalories(message) {
  const withUnit = String(message || '').match(/(\d{2,4})\s*(?:kcal|kalori|kal)/i);
  if (withUnit) {
    const n = Number(withUnit[1]);
    if (Number.isFinite(n) && n >= 50 && n <= 5000) return n;
  }
  const norm = normalizeTr(message);
  if (norm.includes('kalori') || norm.includes('kcal') || norm.includes('oner') || norm.includes('lazim')) {
    const plain = String(message || '').match(/\b(\d{3,4})\b/);
    if (plain) {
      const n = Number(plain[1]);
      if (Number.isFinite(n) && n >= 50 && n <= 5000) return n;
    }
  }
  return null;
}

function suggestForTarget(target, menu) {
  if (!menu.length) return [];
  const sorted = [...menu].sort((a, b) => a.calories - b.calories);

  let bestSingle = sorted[0];
  let bestSingleDiff = Math.abs(bestSingle.calories - target);
  for (const item of sorted) {
    const diff = Math.abs(item.calories - target);
    if (diff < bestSingleDiff) {
      bestSingle = item;
      bestSingleDiff = diff;
    }
  }

  let bestPair = null;
  let bestPairDiff = Infinity;
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i; j < sorted.length; j += 1) {
      const sum = sorted[i].calories + sorted[j].calories;
      const diff = Math.abs(sum - target);
      if (diff < bestPairDiff) {
        bestPairDiff = diff;
        bestPair = i === j ? [sorted[i]] : [sorted[i], sorted[j]];
      }
    }
  }

  if (bestPair && bestPairDiff <= bestSingleDiff * 0.85) {
    return bestPair;
  }
  return [bestSingle];
}

function buildCartReply(cartItems, menu) {
  if (!cartItems.length) {
    return {
      reply: 'Sepetiniz boş görünüyor. Menüden ürün ekledikten sonra tekrar sorabilirsiniz.',
      recommendedProductIds: [],
    };
  }

  const menuById = new Map(menu.map((m) => [m.id, m]));
  let total = 0;
  const lines = [];

  for (const item of cartItems) {
    const fromMenu = menuById.get(item.productId);
    const kcal = fromMenu?.calories || item.calories || 0;
    const lineTotal = kcal * item.qty;
    total += lineTotal;
    if (kcal > 0) {
      lines.push(`${item.name} x${item.qty}: ~${lineTotal} kcal`);
    } else {
      lines.push(`${item.name} x${item.qty}: kalori bilgisi yok`);
    }
  }

  return {
    reply:
      `Sepetinizdeki ürünlerin tahmini toplamı ~${total} kcal.\n` +
      lines.map((l) => `• ${l}`).join('\n'),
    recommendedProductIds: [],
  };
}

/** Basit / net sorularda Gemini beklemeden anında yanıt. */
function tryFastChatReply({ message, menu, cartItems }) {
  const norm = normalizeTr(message);

  if (
    norm.includes('sepet') &&
    (norm.includes('kac') || norm.includes('kaç') || norm.includes('kalori') || norm.includes('toplam'))
  ) {
    return { ...buildCartReply(cartItems, menu), source: 'fast-cart' };
  }

  const matched = findProductsInMessage(message, menu);
  if (matched.length === 1) {
    const p = matched[0];
    return {
      reply:
        `${p.name} yaklaşık ${p.calories} kcal` +
        (p.protein ? ` (protein: ${Math.round(p.protein)} g)` : '') +
        '. Bu değerler porsiyon başına menü bilgisidir.',
      recommendedProductIds: [p.id],
      source: 'fast-product',
    };
  }

  if (matched.length > 1) {
    const lines = matched.slice(0, 5).map((p) => `• ${p.name}: ${p.calories} kcal`);
    return {
      reply: `Şunları buldum:\n${lines.join('\n')}`,
      recommendedProductIds: matched.slice(0, 3).map((p) => p.id),
      source: 'fast-product',
    };
  }

  const target = parseTargetCalories(message);
  if (target) {
    const picks = suggestForTarget(target, menu);
    const sum = picks.reduce((acc, p) => acc + p.calories, 0);
    const names = picks.map((p) => p.name).join(' + ');
    return {
      reply:
        `${target} kcal hedefine yakın bir öneri: ${names} (~${sum} kcal). ` +
        'İstersen farklı bir hedef veya öğün tipi de söyleyebilirsin.',
      recommendedProductIds: picks.map((p) => p.id),
      source: 'fast-target',
    };
  }

  if (norm.includes('dusuk') || norm.includes('hafif') || norm.includes('diyet')) {
    const light = [...menu].sort((a, b) => a.calories - b.calories).slice(0, 3);
    if (!light.length) return null;
    return {
      reply:
        'Daha hafif seçenekler:\n' +
        light.map((p) => `• ${p.name}: ${p.calories} kcal`).join('\n'),
      recommendedProductIds: light.map((p) => p.id),
      source: 'fast-light',
    };
  }

  if (
    norm.includes('oner') ||
    norm.includes('tavsiye') ||
    norm.includes('ne yesem') ||
    norm.includes('ne alsem') ||
    norm.includes('ne alayim')
  ) {
    const sorted = [...menu].sort((a, b) => a.calories - b.calories);
    if (!sorted.length) return null;
    const idx = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
    const picks = [...new Map([idx(0.25), idx(0.5), idx(0.75)].map((p) => [p.id, p])).values()];
    return {
      reply:
        'Menümüzden birkaç öneri:\n' +
        picks.map((p) => `• ${p.name}: ${p.calories} kcal`).join('\n'),
      recommendedProductIds: picks.map((p) => p.id),
      source: 'fast-suggest',
    };
  }

  if (looksLikeCalorieQuestion(message)) {
    const ranked = rankProductsForMessage(message, menu);
    if (ranked.length === 1) {
      const p = ranked[0].p;
      return {
        reply: `${p.name} yaklaşık ${p.calories} kcal.`,
        recommendedProductIds: [p.id],
        source: 'fast-product',
      };
    }
    if (ranked.length > 1) {
      const top = ranked.slice(0, 4).map((x) => x.p);
      return {
        reply:
          'Şunları buldum:\n' +
          top.map((p) => `• ${p.name}: ${p.calories} kcal`).join('\n'),
        recommendedProductIds: top.slice(0, 3).map((p) => p.id),
        source: 'fast-product',
      };
    }
  }

  return null;
}

function ruleBasedChatReply({ message, menu, cartItems }) {
  const fast = tryFastChatReply({ message, menu, cartItems });
  if (fast) return fast;

  return {
    reply:
      'Menümüzdeki ürünlerin kalori bilgisini sorabilir veya hedef kalorine uygun öneri isteyebilirsin. ' +
      'Örnek: "Americano kaç kalori?" veya "1050 kcal için öner".',
    recommendedProductIds: [],
  };
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
}) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;

  const systemPrompt = buildChatSystemPrompt(branchName, menu);
  const cartNote =
    cartItems.length > 0
      ? `\n\nMüşteri sepeti:\n${JSON.stringify(cartItems)}`
      : '';

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
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.25,
          responseMimeType: 'application/json',
          maxOutputTokens: 220,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') return null;
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) return null;

  let data;
  try {
    data = await response.json();
  } catch (_) {
    return null;
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p?.text || '').join('') : '';
  const parsed = parseChatAiResponse(text, menu);
  if (!parsed) return null;
  return { ...parsed, source: 'gemini' };
}

async function askOpenAINutritionChat({
  branchName,
  menu,
  message,
  history,
  cartItems,
}) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const systemPrompt = buildChatSystemPrompt(branchName, menu);
  const cartNote =
    cartItems.length > 0
      ? `\n\nMüşteri sepeti:\n${JSON.stringify(cartItems)}`
      : '';

  const messages = [
    { role: 'system', content: systemPrompt },
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
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const e = new Error('AI yanıt süresi aşıldı.');
      e.statusCode = 504;
      throw e;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) return null;

  let data;
  try {
    data = await response.json();
  } catch (_) {
    return null;
  }

  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = parseChatAiResponse(text, menu);
  if (!parsed) return null;
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

function shouldUseGemini(message, history) {
  if (String(process.env.NUTRITION_CHAT_USE_AI || 'true').toLowerCase() === 'false') {
    return false;
  }
  const norm = normalizeTr(message);
  if (history.length > 0) return true;
  if (norm.length > 120) return true;
  if (norm.includes('neden') || norm.includes('acikla') || norm.includes('fark')) return true;
  return false;
}

async function handleNutritionChat({
  branchId,
  message,
  history = [],
  cartItems = [],
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

  const [branch, menu] = await Promise.all([
    Branch.findById(branchId).select('name').lean(),
    loadBranchMenu(branchId),
  ]);

  const branchName = branch?.name || 'Restoran';
  const safeHistory = sanitizeHistory(history);
  const safeCart = sanitizeCartItems(cartItems);

  if (!menu.length) {
    return {
      reply:
        'Bu şubede henüz müşterilere açık kalori bilgisi olan ürün yok. ' +
        'Yöneticiniz ürün besin değerlerini yayınladığında buradan öneri alabilirsiniz.',
      products: [],
      source: 'menu-empty',
    };
  }

  const fast = tryFastChatReply({ message: text, menu, cartItems: safeCart });
  if (fast) {
    return {
      reply: fast.reply,
      products: mapRecommendedProducts(menu, fast.recommendedProductIds || []),
      source: fast.source,
    };
  }

  let result = null;
  if (shouldUseGemini(text, safeHistory)) {
    result = await askGeminiNutritionChat({
      branchName,
      menu,
      message: text,
      history: safeHistory,
      cartItems: safeCart,
    });
  }

  if (!result) {
    const fallback = ruleBasedChatReply({
      message: text,
      menu,
      cartItems: safeCart,
    });
    result = { ...fallback, source: fallback.source || 'rule-based' };
  }

  return {
    reply: result.reply,
    products: mapRecommendedProducts(menu, result.recommendedProductIds || []),
    source: result.source || 'ai',
  };
}

module.exports = {
  handleNutritionChat,
  loadBranchMenu,
};
