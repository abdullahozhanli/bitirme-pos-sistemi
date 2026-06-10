const {
  AI_KEY_MISSING_MSG,
  NUTRITION_SYSTEM_PROMPT,
  resolveAiProvider,
  hasAiProvider,
  extractJsonFromAiContent,
  buildProductUserPrompt,
  sanitizeAiNutritionEstimate,
} = require('./nutritionEstimateShared');
const { estimateProductNutritionWithGemini } = require('./geminiNutritionService');

const OPENAI_TIMEOUT_MS = 30000;

async function estimateProductNutritionWithOpenAI(product) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return { error: 'OPENAI_API_KEY tanımlı değil', statusCode: 500 };
  }

  const userPrompt = buildProductUserPrompt(product);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

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
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: NUTRITION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      return {
        error: 'AI yanıt süresi aşıldı. Lütfen tekrar deneyin.',
        statusCode: 504,
      };
    }
    return {
      error: 'OpenAI servisine bağlanılamadı.',
      statusCode: 502,
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return {
      error: `OpenAI servisi hatası (${response.status}).`,
      statusCode: 502,
    };
  }

  let data;
  try {
    data = await response.json();
  } catch (_) {
    return { error: 'OpenAI yanıtı okunamadı.', statusCode: 502 };
  }

  const message = data?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonFromAiContent(message);
  if (!parsed) {
    return { error: 'AI yanıtı işlenemedi. Geçerli JSON dönmedi.', statusCode: 422 };
  }

  return sanitizeAiNutritionEstimate(parsed);
}

/**
 * Ürün besin tahmini — öncelik: Gemini, yoksa OpenAI.
 */
async function estimateProductNutrition(product) {
  const provider = resolveAiProvider();
  if (!provider) {
    return {
      error: AI_KEY_MISSING_MSG,
      statusCode: 500,
    };
  }

  if (provider === 'gemini') {
    return estimateProductNutritionWithGemini(product);
  }

  return estimateProductNutritionWithOpenAI(product);
}

module.exports = {
  estimateProductNutrition,
  estimateProductNutritionWithOpenAI,
  sanitizeAiNutritionEstimate,
  resolveAiProvider,
  hasAiProvider,
  AI_KEY_MISSING_MSG,
};
