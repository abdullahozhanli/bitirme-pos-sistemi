const express = require('express');
const MealCalorieEstimate = require('../models/MealCalorieEstimate');

const router = express.Router();

const MAX_TEXT_LENGTH = 600;
const MAX_IMAGE_LENGTH = 4_000_000;
const USDA_TIMEOUT_MS = 15000;

/** Porsiyon başına tipik kalori (Türkiye restoran / ev ölçüsü). */
const MEAL_ITEM_DB = [
  { keywords: ['cheeseburger', 'hamburger', 'burger', 'big mac'], kcal: 550 },
  { keywords: ['döner', 'doner', 'tavuk döner', 'et döner', 'dürüm'], kcal: 620 },
  { keywords: ['lahmacun'], kcal: 210 },
  { keywords: ['pide'], kcal: 480 },
  { keywords: ['pizza dilim', 'pizza slice'], kcal: 285 },
  { keywords: ['pizza'], kcal: 750 },
  { keywords: ['kebap', 'şiş', 'sis kebap', 'adana', 'urfa'], kcal: 580 },
  { keywords: ['köfte', 'kofte'], kcal: 420 },
  { keywords: ['tavuk şinitzel', 'şinitzel', 'schnitzel'], kcal: 480 },
  { keywords: ['tavuk kanat', 'chicken wing'], kcal: 95 },
  { keywords: ['tavuk', 'chicken'], kcal: 220 },
  { keywords: ['pilav', 'bulgur', 'rice'], kcal: 180 },
  { keywords: ['patates kızartma', 'patates kizartma', 'french fries', 'cips'], kcal: 320 },
  { keywords: ['salata', 'salad'], kcal: 90 },
  { keywords: ['çorba', 'corba', 'soup'], kcal: 120 },
  { keywords: ['börek', 'borek'], kcal: 280 },
  { keywords: ['simit'], kcal: 280 },
  { keywords: ['tost'], kcal: 350 },
  { keywords: ['sandviç', 'sandwich'], kcal: 380 },
  { keywords: ['makarna', 'pasta', 'spagetti'], kcal: 450 },
  { keywords: ['baklava'], kcal: 330 },
  { keywords: ['dondurma', 'ice cream'], kcal: 180 },
  { keywords: ['kola zero', 'cola zero', 'diet coke', 'diyet kola'], kcal: 2 },
  { keywords: ['kola', 'cola', 'gazoz'], kcal: 140 },
  { keywords: ['ayran'], kcal: 75 },
  { keywords: ['meyve suyu', 'juice'], kcal: 110 },
  { keywords: ['latte', 'cappuccino', 'kahve'], kcal: 120 },
  { keywords: ['su'], kcal: 0 },
];

const SANITY_FLOORS = [
  { keys: ['burger', 'hamburger', 'cheeseburger'], min: 420 },
  { keys: ['döner', 'doner', 'dürüm'], min: 450 },
  { keys: ['pizza'], min: 500 },
  { keys: ['kebap', 'adana', 'urfa', 'köfte'], min: 380 },
];

function sanitizeText(value) {
  return String(value || '').trim();
}

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

function extractJsonObject(content) {
  const raw = String(content || '').trim();
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function parseQuantity(segment) {
  const m = String(segment || '').match(/(\d+(?:[.,]\d+)?)\s*(adet|porsiyon|dilim|bardak|tabak|kase|tane)?/i);
  if (!m) return 1;
  const n = Number(String(m[1]).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.min(6, Math.round(n)) : 1;
}

function findMealItem(segment) {
  const norm = normalizeTr(segment);
  if (!norm) return null;
  let best = null;
  let bestLen = 0;
  for (const entry of MEAL_ITEM_DB) {
    for (const kw of entry.keywords) {
      const nkw = normalizeTr(kw);
      if (norm.includes(nkw) && nkw.length > bestLen) {
        best = entry;
        bestLen = nkw.length;
      }
    }
  }
  return best;
}

function splitMealSegments(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;+\n]|(?:\s+ve\s+)|(?:\s+ile\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Metinden bilinen kalemleri toplayarak tahmin. */
function estimateFromMealParser(text) {
  const segments = splitMealSegments(text);
  const parts = segments.length ? segments : [text];
  let total = 0;
  let matched = 0;

  for (const part of parts) {
    const item = findMealItem(part);
    if (!item) continue;
    const qty = parseQuantity(part);
    let kcal = item.kcal * qty;
    if (
      (normalizeTr(part).includes('kola') ||
        normalizeTr(part).includes('cola') ||
        normalizeTr(part).includes('ayran') ||
        normalizeTr(part).includes('gazoz')) &&
      !/\d/.test(part)
    ) {
      kcal = Math.round((item.kcal * 330) / 100);
    }
    total += kcal;
    matched += 1;
  }

  if (!matched) return null;

  return {
    estimatedCalories: Math.max(0, Math.round(total)),
    confidence: matched > 1 ? 'medium' : 'low',
    method: 'meal-parser',
  };
}

function applySanityFloor(text, calories) {
  const norm = normalizeTr(text);
  let out = calories;
  for (const rule of SANITY_FLOORS) {
    if (rule.keys.some((k) => norm.includes(normalizeTr(k)))) {
      out = Math.max(out, rule.min);
    }
  }
  return out;
}

function reconcileEstimate(text, primary, fallback) {
  const parsed = estimateFromMealParser(text);
  let calories = primary.estimatedCalories;
  let confidence = primary.confidence || 'medium';

  if (parsed) {
    if (!Number.isFinite(calories) || calories <= 0) {
      calories = parsed.estimatedCalories;
      confidence = parsed.confidence;
    } else if (calories < parsed.estimatedCalories * 0.55) {
      calories = Math.round((calories + parsed.estimatedCalories) / 2);
      confidence = 'medium';
    }
  } else if ((!Number.isFinite(calories) || calories <= 0) && fallback) {
    calories = fallback.estimatedCalories;
    confidence = fallback.confidence;
  }

  if (!Number.isFinite(calories) || calories <= 0) {
    const tokens = String(text || '').split(/\s+/).filter(Boolean).length;
    calories = Math.min(1200, Math.max(350, tokens * 120));
    confidence = 'low';
  }

  calories = applySanityFloor(text, calories);

  return {
    estimatedCalories: Math.max(0, Math.round(calories)),
    confidence: ['low', 'medium', 'high'].includes(confidence)
      ? confidence
      : 'medium',
  };
}

function parseCaloriesFromNutrients(nutrients) {
  const list = Array.isArray(nutrients) ? nutrients : [];
  const calorieItem = list.find((n) => Number(n?.nutrientNumber) === 1008);
  if (calorieItem && Number.isFinite(Number(calorieItem.value))) {
    return Number(calorieItem.value);
  }
  const energyItem = list.find((n) =>
    String(n?.nutrientName || '').toLowerCase().includes('energy')
  );
  if (energyItem && Number.isFinite(Number(energyItem.value))) {
    let val = Number(energyItem.value);
    const unit = String(energyItem?.unitName || '').toLowerCase();
    if (unit === 'kj' || val > 1200) {
      val = Math.round(val / 4.184);
    }
    return val;
  }
  return null;
}

function scaleUsdaCalories(food, baseCalories) {
  if (!Number.isFinite(baseCalories) || baseCalories <= 0) return null;
  const servingSize = Number(food?.servingSize);
  const unit = String(food?.servingSizeUnit || '').toLowerCase();

  if (Number.isFinite(servingSize) && servingSize > 0) {
    if (unit === 'g' && servingSize >= 150 && baseCalories < 400) {
      return Math.round((baseCalories / 100) * servingSize);
    }
    if (unit === 'g' && servingSize <= 120 && baseCalories > 50) {
      return Math.round(baseCalories);
    }
    if ((unit === 'ml' || unit === 'g') && servingSize > 0) {
      return Math.round(baseCalories);
    }
  }

  if (baseCalories < 280) {
    return Math.round(baseCalories * 2.2);
  }
  return Math.round(baseCalories);
}

const OPENAI_SYSTEM_PROMPT =
  'Sen deneyimli bir beslenme uzmanısın. Kullanıcının yazdığı öğünü veya fotoğrafını ' +
  'Türkiye porsiyonlarına göre değerlendir. Ana yemek + içecek + garnitür varsa hepsini topla. ' +
  'Tek bir hamburger menü genelde 700-1100 kcal, tek döner dürüm 500-800, pizza (orta) 700-1200, ' +
  '1 kola (330ml) ~140 kcal, pilav tabağı ~180-250 kcal. ' +
  'Abartma; gerçekçi aralığın orta noktasını ver. ' +
  'Yanıtı yalnızca JSON olarak ver: {"estimatedCalories":number,"confidence":"low|medium|high","notes":string}';

async function askCalorieEstimateWithOpenAI({ text, imageBase64 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY tanımlı değil');
    err.statusCode = 500;
    throw err;
  }

  const userContent = [];
  if (text) {
    userContent.push({
      type: 'text',
      text: `Öğün açıklaması:\n${text}\n\nToplam kaloriyi hesapla.`,
    });
  }
  if (imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
    });
    if (!text) {
      userContent.unshift({
        type: 'text',
        text: 'Fotoğraftaki öğünün toplam kalorisini tahmin et.',
      });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
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
        temperature: 0.15,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: OPENAI_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const textBody = await response.text();
    const err = new Error(`AI servisi hatası: ${response.status}`);
    err.details = textBody;
    err.statusCode = 502;
    throw err;
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonObject(message);
  const estimatedCalories = Number(parsed?.estimatedCalories);
  const confidence = String(parsed?.confidence || 'medium').toLowerCase();
  const parserFallback = estimateFromMealParser(text);

  return reconcileEstimate(
    text,
    {
      estimatedCalories,
      confidence: ['low', 'medium', 'high'].includes(confidence)
        ? confidence
        : 'medium',
    },
    parserFallback
  );
}

async function askCalorieEstimateWithUsda(text) {
  const parserFirst = estimateFromMealParser(text);
  if (parserFirst) return parserFirst;

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    const err = new Error('USDA_API_KEY tanımlı değil');
    err.statusCode = 500;
    throw err;
  }

  const query = encodeURIComponent(text);
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}` +
    `&query=${query}&pageSize=8&dataType=Foundation,Survey (FNDDS),SR Legacy`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), USDA_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { method: 'GET', signal: controller.signal });
  } catch (_) {
    return reconcileEstimate(text, { estimatedCalories: 0, confidence: 'low' }, null);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return reconcileEstimate(text, { estimatedCalories: 0, confidence: 'low' }, null);
  }

  const data = await response.json();
  const foods = Array.isArray(data?.foods) ? data.foods : [];
  if (!foods.length) {
    return reconcileEstimate(text, { estimatedCalories: 0, confidence: 'low' }, null);
  }

  const textLower = normalizeTr(text);
  const candidates = foods
    .map((food) => {
      const raw = parseCaloriesFromNutrients(food?.foodNutrients);
      const calories = scaleUsdaCalories(food, raw);
      return {
        description: normalizeTr(food?.description || ''),
        calories,
      };
    })
    .filter((item) => Number.isFinite(item.calories) && item.calories > 0);

  if (!candidates.length) {
    return reconcileEstimate(text, { estimatedCalories: 0, confidence: 'low' }, null);
  }

  const ranked = candidates
    .map((c) => {
      let score = 0;
      if (textLower.includes(c.description)) score += 3;
      if (c.description.includes(textLower.split(' ')[0])) score += 1;
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  return reconcileEstimate(
    text,
    { estimatedCalories: best.calories, confidence: 'low' },
    null
  );
}

router.post('/estimate', async (req, res, next) => {
  try {
    const userInputText = sanitizeText(req.body?.text);
    const imageBase64 = String(req.body?.imageBase64 || '').trim();

    if (!userInputText && !imageBase64) {
      return res
        .status(400)
        .json({ message: 'En az metin veya fotoğraf girişi gerekli.' });
    }

    if (userInputText.length > MAX_TEXT_LENGTH) {
      return res
        .status(400)
        .json({ message: `Metin en fazla ${MAX_TEXT_LENGTH} karakter olabilir.` });
    }

    if (imageBase64.length > MAX_IMAGE_LENGTH) {
      return res.status(400).json({ message: 'Görsel boyutu çok büyük.' });
    }

    if (!userInputText && imageBase64 && !process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        message: 'Fotoğraf analizi için AI key gerekli. Lütfen metin de girin.',
      });
    }

    let aiResult;
    let source = 'openai';
    try {
      if (process.env.OPENAI_API_KEY) {
        aiResult = await askCalorieEstimateWithOpenAI({
          text: userInputText,
          imageBase64,
        });
      } else {
        source = 'usda';
        aiResult = await askCalorieEstimateWithUsda(userInputText);
      }
    } catch (aiError) {
      const parserOnly = estimateFromMealParser(userInputText);
      if (parserOnly) {
        aiResult = parserOnly;
        source = 'meal-parser';
      } else if (process.env.USDA_API_KEY && userInputText) {
        source = 'usda';
        aiResult = await askCalorieEstimateWithUsda(userInputText);
      } else {
        throw aiError;
      }
    }

    const estimate = await MealCalorieEstimate.create({
      userInputText,
      imageUrl: imageBase64 ? 'inline-base64' : '',
      estimatedCalories: aiResult.estimatedCalories,
      confidence: aiResult.confidence,
      source,
    });

    res.json({
      id: estimate._id,
      estimatedCalories: estimate.estimatedCalories,
      confidence: estimate.confidence,
      source: estimate.source,
      createdAt: estimate.createdAt,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ message: 'AI yanıt süresi aşıldı. Tekrar deneyin.' });
    }
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
});

module.exports = router;
