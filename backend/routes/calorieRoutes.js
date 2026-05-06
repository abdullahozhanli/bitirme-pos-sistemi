const express = require('express');
const MealCalorieEstimate = require('../models/MealCalorieEstimate');

const router = express.Router();

const MAX_TEXT_LENGTH = 600;
const MAX_IMAGE_LENGTH = 4_000_000;
const USDA_TIMEOUT_MS = 15000;

const FALLBACK_CALORIE_MAP = [
  { keywords: ['kola zero', 'cola zero', 'diet coke', 'diyet kola'], kcal: 1 },
  { keywords: ['kola', 'cola'], kcal: 42 },
  { keywords: ['ayran'], kcal: 37 },
  { keywords: ['su'], kcal: 0 },
  { keywords: ['hamburger'], kcal: 250 },
  { keywords: ['pizza'], kcal: 266 },
  { keywords: ['pilav'], kcal: 130 },
  { keywords: ['tavuk'], kcal: 165 },
  { keywords: ['patates kizartma', 'patates kızartma'], kcal: 312 },
];

function sanitizeText(value) {
  return String(value || '').trim();
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
    return Number(energyItem.value);
  }
  return null;
}

function estimateFromFallbackText(text) {
  const raw = String(text || '').toLowerCase();
  if (!raw) return null;
  const matched = FALLBACK_CALORIE_MAP.find((entry) =>
    entry.keywords.some((k) => raw.includes(k))
  );
  if (!matched) return null;

  let base = matched.kcal;
  if (raw.includes('kola') || raw.includes('cola') || raw.includes('ayran')) {
    // Içecekler için 330ml varsayımı: 100ml bazlı değeri çarparız.
    base = Math.round((matched.kcal * 330) / 100);
  }

  return {
    estimatedCalories: Math.max(0, Math.round(base)),
    confidence: 'low',
  };
}

function estimateGenericFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return { estimatedCalories: 180, confidence: 'low' };
  }
  const tokenCount = raw.split(/\s+/).filter(Boolean).length;
  const kcal = Math.min(900, Math.max(120, tokenCount * 90));
  return { estimatedCalories: kcal, confidence: 'low' };
}

async function askCalorieEstimateWithOpenAI({ text, imageBase64 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY tanımlı değil');
    err.statusCode = 500;
    throw err;
  }

  const content = [
    {
      type: 'text',
      text:
        'Sen bir beslenme asistanısın. Verilen öğün için yaklaşık toplam kaloriyi hesapla. ' +
        'Sadece JSON döndür: {"estimatedCalories":number,"confidence":"low|medium|high"}',
    },
  ];

  if (text) {
    content.push({
      type: 'text',
      text: `Kullanıcı metni: ${text}`,
    });
  }

  if (imageBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
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
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Tahmini kısa ve tutarlı ver.' },
          { role: 'user', content },
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
  const fallback = estimateFromFallbackText(text) || estimateGenericFromText(text);

  return {
    estimatedCalories:
      Number.isFinite(estimatedCalories) && estimatedCalories > 0
        ? Math.max(0, Math.round(estimatedCalories))
        : fallback.estimatedCalories,
    confidence: ['low', 'medium', 'high'].includes(confidence)
      ? confidence
      : fallback.confidence || 'medium',
  };
}

async function askCalorieEstimateWithUsda(text) {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    const err = new Error('USDA_API_KEY tanımlı değil');
    err.statusCode = 500;
    throw err;
  }

  const query = encodeURIComponent(text);
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}` +
    `&query=${query}&pageSize=5&dataType=Foundation,Survey (FNDDS),SR Legacy`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), USDA_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { method: 'GET', signal: controller.signal });
  } catch (fetchError) {
    return estimateFromFallbackText(text) || estimateGenericFromText(text);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text();
    const fallback = estimateFromFallbackText(text) || estimateGenericFromText(text);
    return {
      ...fallback,
      details: body ? 'USDA fallback kullanildi' : undefined,
    };
  }

  const data = await response.json();
  const foods = Array.isArray(data?.foods) ? data.foods : [];
  if (!foods.length) {
    return estimateFromFallbackText(text) || estimateGenericFromText(text);
  }

  const candidates = foods
    .map((food) => ({
      description: String(food?.description || '').toLowerCase(),
      calories: parseCaloriesFromNutrients(food?.foodNutrients),
    }))
    .filter((item) => Number.isFinite(item.calories) && item.calories > 0);

  if (!candidates.length) {
    return estimateFromFallbackText(text) || estimateGenericFromText(text);
  }

  const textLower = String(text || '').toLowerCase();
  const exactish =
    candidates.find((c) => textLower.includes(c.description) || c.description.includes(textLower)) ||
    candidates[0];

  return {
    estimatedCalories: Math.max(0, Math.round(exactish.calories)),
    confidence: candidates.length > 2 ? 'medium' : 'low',
  };
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

    const aiResult = process.env.OPENAI_API_KEY
      ? await askCalorieEstimateWithOpenAI({ text: userInputText, imageBase64 })
      : await askCalorieEstimateWithUsda(userInputText);
    const estimate = await MealCalorieEstimate.create({
      userInputText,
      imageUrl: imageBase64 ? 'inline-base64' : '',
      estimatedCalories: aiResult.estimatedCalories,
      confidence: aiResult.confidence,
      source: process.env.OPENAI_API_KEY ? 'openai' : 'usda',
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
