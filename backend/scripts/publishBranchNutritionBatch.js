/**
 * Şube menüsünü küçük Gemini batch'leriyle işler (rate limit + token dostu).
 * node scripts/publishBranchNutritionBatch.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { hasAiProvider } = require('../services/aiNutritionService');
const { extractJsonFromAiContent } = require('../services/nutritionEstimateShared');

const TARGET_BRANCH_NAMES = ['Brew Mood', 'Yeşil Mola Cafe'];
const BATCH_SIZE = 8;
const CHUNK_DELAY_MS = 4000;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-flash-latest'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveGeminiModels() {
  const configured = String(process.env.GEMINI_MODEL || '').trim();
  return [...new Set([configured || DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_MODEL, ...GEMINI_MODEL_FALLBACKS].filter(Boolean))];
}

function isPublished(p) {
  return (
    p.nutritionStatus === 'approved' &&
    p.nutrition?.calories > 0 &&
    p.nutrition?.isNutritionVisibleToCustomer &&
    String(p.description || '').trim()
  );
}

function parseBatchJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const arrayStart = raw.indexOf('[');
  const arrayEnd = raw.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    try {
      const parsed = JSON.parse(raw.slice(arrayStart, arrayEnd + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // fall through
    }
  }

  const object = extractJsonFromAiContent(raw);
  if (!object || typeof object !== 'object' || Array.isArray(object)) {
    return null;
  }

  const list =
    object.items ||
    object.products ||
    object.menu ||
    object.results ||
    object.data;
  return Array.isArray(list) ? list : null;
}

async function callGeminiBatch(apiKey, model, prompt) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
      },
    }),
  });

  return response;
}

async function geminiBatch(branchName, items, retry = 0) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  const models = resolveGeminiModels();

  const menuLines = items
    .map(
      (p, i) =>
        `${i + 1}. id="${p._id}" ad="${p.name}" kategori="${p.categoryName || ''}"` +
        (p.description ? ` mevcut_aciklama="${p.description}"` : '')
    )
    .join('\n');

  const prompt =
    `Sen Türkiye restoran/kafe beslenme uzmanısın. "${branchName}" şubesi menüsü için listedeki HER ürün için ` +
    `müşteri açıklaması (1-2 cümle Türkçe) ve tek porsiyon tahmini besin değerleri üret.\n` +
    `Kurallar: Ürün adıyla çelişen malzeme yazma. Tahminidir. Negatif değer yok. Listedeki tüm ürünler items dizisinde olmalı.\n` +
    `Yanıt YALNIZCA şu JSON nesne formatında olsun, başka metin ekleme:\n` +
    `{"items":[{"productId":string,"customerDescription":string,"calories":number,"protein":number,"carbs":number,"fat":number,"servingGram":number,"portionUnit":string,"ingredients":string[],"allergens":string[],"confidence":"low"|"medium"|"high"}]}\n\n` +
    `Menü:\n${menuLines}`;

  let lastError = 'Beklenen JSON dizi dönmedi';
  let lastSnippet = '';

  for (const model of models) {
    const response = await callGeminiBatch(apiKey, model, prompt);

    if (response.status === 429 && retry < 5) {
      const wait = 20000 * (retry + 1);
      console.log(`  Rate limit (${model}) — ${wait / 1000}s bekleniyor...`);
      await sleep(wait);
      return geminiBatch(branchName, items, retry + 1);
    }

    if (response.status === 404) {
      lastError = `Model bulunamadı: ${model}`;
      continue;
    }

    if (!response.ok) {
      lastError = `Gemini HTTP ${response.status} (model: ${model})`;
      continue;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const parsed = parseBatchJson(text);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }

    lastSnippet = text.slice(0, 400);
    lastError = `JSON parse hatası (model: ${model})`;
  }

  if (lastSnippet) {
    console.log(`  Ham yanıt (ilk 400 karakter): ${lastSnippet}`);
  }
  throw new Error(lastError);
}

function chunkArray(list, size) {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

function nutritionFromRow(row) {
  const now = new Date();
  return {
    calories: Math.round(Number(row.calories) || 0),
    protein: Math.round(Number(row.protein || 0) * 10) / 10,
    carbs: Math.round(Number(row.carbs || 0) * 10) / 10,
    fat: Math.round(Number(row.fat || 0) * 10) / 10,
    servingGram: Math.round(Number(row.servingGram) || 0),
    portionUnit: row.portionUnit ? String(row.portionUnit) : undefined,
    ingredients: Array.isArray(row.ingredients) && row.ingredients.length ? row.ingredients : undefined,
    allergens: Array.isArray(row.allergens) && row.allergens.length ? row.allergens : undefined,
    confidence: ['low', 'medium', 'high'].includes(row.confidence) ? row.confidence : 'medium',
    source: 'ai_estimate',
    estimatedAt: now,
    updatedAt: now,
    approvedAt: now,
    isNutritionVisibleToCustomer: true,
  };
}

async function main() {
  if (!hasAiProvider()) {
    console.error('GEMINI_API_KEY gerekli');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const branches = await Branch.find({ name: { $in: TARGET_BRANCH_NAMES } }).lean();

  for (const branch of branches) {
    console.log(`\n=== ${branch.name} ===`);
    const products = await Product.find({ branchId: branch._id }).populate('category', 'name');
    const pending = products.filter((p) => !isPublished(p));

    if (!pending.length) {
      console.log('  Tüm ürünler zaten yayında.');
      continue;
    }

    const items = pending.map((p) => ({
      _id: String(p._id),
      name: p.name,
      description: String(p.description || '').trim(),
      categoryName: p.category?.name || '',
    }));

    const chunks = chunkArray(items, BATCH_SIZE);
    console.log(`  ${items.length} ürün, ${chunks.length} batch (en fazla ${BATCH_SIZE} ürün/istek)...`);

    const rows = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      console.log(`  Batch ${i + 1}/${chunks.length} (${chunk.length} ürün)...`);
      const batchRows = await geminiBatch(branch.name, chunk);
      rows.push(...batchRows);
      if (i < chunks.length - 1) {
        await sleep(CHUNK_DELAY_MS);
      }
    }

    const byId = new Map(rows.map((r) => [String(r.productId || r.id || ''), r]));

    let ok = 0;
    for (const product of pending) {
      const row = byId.get(String(product._id));
      if (!row || !Number(row.calories)) {
        console.log(`  [skip] ${product.name} — AI satırı yok`);
        continue;
      }

      const description =
        String(row.customerDescription || '').trim() ||
        String(product.description || '').trim() ||
        `${product.name} — ${branch.name} menüsünden özel lezzet.`;

      const nutrition = nutritionFromRow(row);
      if (!nutrition.calories) continue;

      await Product.updateOne(
        { _id: product._id },
        { description, nutrition, nutritionStatus: 'approved' }
      );
      console.log(`  [ok] ${product.name} (${nutrition.calories} kcal)`);
      ok += 1;
    }
    console.log(`  Yayınlanan: ${ok}/${pending.length}`);
    await sleep(5000);
  }

  await mongoose.disconnect();
  console.log('\nTamamlandı.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
