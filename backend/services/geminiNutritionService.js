const {
  NUTRITION_SYSTEM_PROMPT,
  buildProductUserPrompt,
  extractJsonFromAiContent,
  sanitizeAiNutritionEstimate,
} = require('./nutritionEstimateShared');

const GEMINI_TIMEOUT_MS = 30000;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-flash-latest'];

function resolveGeminiModelsToTry() {
  const configured = String(process.env.GEMINI_MODEL || '').trim();
  const models = [configured || DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_MODEL, ...GEMINI_MODEL_FALLBACKS];
  return [...new Set(models.filter(Boolean))];
}

async function callGeminiGenerateContent(apiKey, model, userPrompt) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: NUTRITION_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    return response;
  } catch (err) {
    if (err?.name === 'AbortError') {
      return {
        error: 'AI yanıt süresi aşıldı. Lütfen tekrar deneyin.',
        statusCode: 504,
      };
    }
    return {
      error: 'Gemini servisine bağlanılamadı.',
      statusCode: 502,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Gemini API ile ürün besin değeri tahmini.
 * @param {object} product
 * @returns {Promise<{ estimate } | { error: string, statusCode?: number }>}
 */
async function estimateProductNutritionWithGemini(product) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return { error: 'GEMINI_API_KEY tanımlı değil', statusCode: 500 };
  }

  const userPrompt = buildProductUserPrompt(product);
  const modelsToTry = resolveGeminiModelsToTry();
  let lastStatus = 502;
  let lastModel = modelsToTry[0];

  for (const model of modelsToTry) {
    lastModel = model;
    const response = await callGeminiGenerateContent(apiKey, model, userPrompt);

    if (response?.error) {
      return response;
    }

    if (response.status === 404) {
      lastStatus = 404;
      continue;
    }

    if (!response.ok) {
      return {
        error: `Gemini servisi hatası (${response.status}, model: ${model}).`,
        statusCode: 502,
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (_) {
      return { error: 'Gemini yanıtı okunamadı.', statusCode: 502 };
    }

    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((p) => p?.text || '').join('')
      : '';

    const parsed = extractJsonFromAiContent(text);
    if (!parsed) {
      return { error: 'AI yanıtı işlenemedi. Geçerli JSON dönmedi.', statusCode: 422 };
    }

    return sanitizeAiNutritionEstimate(parsed);
  }

  return {
    error:
      `Gemini modeli bulunamadı (${lastStatus}, model: ${lastModel}). ` +
      'GEMINI_MODEL değerini güncelleyin; örn. gemini-2.5-flash-lite veya gemini-2.5-flash.',
    statusCode: 502,
  };
}

module.exports = {
  estimateProductNutritionWithGemini,
};
