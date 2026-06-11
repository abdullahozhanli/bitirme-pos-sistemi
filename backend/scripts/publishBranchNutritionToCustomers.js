/**
 * Şube ürünlerine açıklama + besin değeri ekler ve müşteriye yayınlar.
 * Kullanım: node scripts/publishBranchNutritionToCustomers.js
 *            node scripts/publishBranchNutritionToCustomers.js --dry-run
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { hasAiProvider } = require('../services/aiNutritionService');
const {
  extractJsonFromAiContent,
  sanitizeAiNutritionEstimate,
  NUTRITION_SYSTEM_PROMPT,
  buildProductUserPrompt,
} = require('../services/nutritionEstimateShared');

const TARGET_BRANCH_NAMES = ['Brew Mood', 'Yeşil Mola Cafe'];
const DELAY_MS = 4500;
const MAX_RETRIES = 4;
const dryRun = process.argv.includes('--dry-run');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPublished(product) {
  const n = product.nutrition;
  return (
    product.nutritionStatus === 'approved' &&
    n &&
    Number(n.calories) > 0 &&
    n.isNutritionVisibleToCustomer === true &&
    String(product.description || '').trim().length > 0
  );
}

function nutritionFromEstimate(estimate) {
  const now = new Date();
  return {
    calories: estimate.calories,
    protein: estimate.protein,
    carbs: estimate.carbs,
    fat: estimate.fat,
    servingGram: estimate.servingGram,
    portionUnit: estimate.portionUnit || undefined,
    ingredients: estimate.ingredients?.length ? estimate.ingredients : undefined,
    allergens: estimate.allergens?.length ? estimate.allergens : undefined,
    confidence: estimate.confidence,
    source: 'ai_estimate',
    estimatedAt: now,
    updatedAt: now,
    approvedAt: now,
    isNutritionVisibleToCustomer: true,
  };
}

async function callGeminiWithRetry(body) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  const models = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-flash-latest',
  ].filter(Boolean);
  const uniqueModels = [...new Set(models)];

  let lastError = 'Gemini hatası';
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    for (const model of uniqueModels) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
        `:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        lastError = `Rate limit (429) model=${model}`;
        break;
      }

      if (!response.ok) {
        lastError = `HTTP ${response.status} model=${model}`;
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      return { text, model };
    }

    const waitMs = 15000 * (attempt + 1);
    console.log(`    Bekleniyor ${waitMs / 1000}s (rate limit)...`);
    await sleep(waitMs);
  }

  throw new Error(lastError);
}

async function estimateDescriptionAndNutrition(product, categoryName, needDescription) {
  const userPrompt =
    buildProductUserPrompt({
      name: product.name,
      description: product.description,
      price: product.price,
      category: categoryName ? { name: categoryName } : null,
    }) +
    (needDescription
      ? '\n\nEk: Ürün açıklaması yoksa customerDescription alanına 1-2 cümle Türkçe müşteri açıklaması yaz.'
      : '\n\nEk: customerDescription alanını boş string bırak.');

  const schemaHint =
    '{"customerDescription":string,"calories":number,"protein":number,"carbs":number,"fat":number,' +
    '"servingGram":number,"portionUnit":string,"ingredients":string[],"allergens":string[],"confidence":"low"|"medium"|"high"}';

  const systemPrompt =
    NUTRITION_SYSTEM_PROMPT.replace(
      /Beklenen şema:[\s\S]*$/,
      `Beklenen şema: ${schemaHint}`
    ) + ' nutritionNote alanı döndürme.';

  const { text } = await callGeminiWithRetry({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  });

  const parsed = extractJsonFromAiContent(text);
  if (!parsed) throw new Error('JSON parse hatası');

  const { customerDescription, ...nutritionRaw } = parsed;
  const sanitized = sanitizeAiNutritionEstimate(nutritionRaw);
  if (sanitized.error) throw new Error(sanitized.error);

  return {
    description: needDescription ? String(customerDescription || '').trim() : '',
    estimate: sanitized.estimate,
  };
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI gerekli');
    process.exit(1);
  }
  if (!hasAiProvider()) {
    console.error('GEMINI_API_KEY veya OPENAI_API_KEY gerekli');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const branches = await Branch.find({ name: { $in: TARGET_BRANCH_NAMES } }).lean();
  console.log(dryRun ? 'DRY RUN\n' : 'Yayınlama başlıyor...\n');

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const branch of branches) {
    console.log(`\n=== ${branch.name} ===`);
    const products = await Product.find({ branchId: branch._id })
      .populate('category', 'name')
      .sort({ name: 1 });

    for (const product of products) {
      if (isPublished(product)) {
        console.log(`  [skip] ${product.name}`);
        skip += 1;
        continue;
      }

      const categoryName = product.category?.name || '';
      const needDescription = !String(product.description || '').trim();

      try {
        console.log(`  [run]  ${product.name}${needDescription ? ' (+açıklama)' : ''}...`);

        if (dryRun) {
          ok += 1;
          continue;
        }

        const result = await estimateDescriptionAndNutrition(product, categoryName, needDescription);
        await sleep(DELAY_MS);

        const update = {
          nutrition: nutritionFromEstimate(result.estimate),
          nutritionStatus: 'approved',
        };
        if (needDescription && result.description) {
          update.description = result.description;
        } else if (needDescription && !result.description) {
          update.description = `${product.name} — ${branch.name} menüsünden özel seçim.`;
        }

        await Product.updateOne({ _id: product._id }, update);
        console.log(`  [ok]   ${product.name} (${result.estimate.calories} kcal)`);
        ok += 1;
      } catch (err) {
        console.error(`  [fail] ${product.name}: ${err.message}`);
        fail += 1;
      }
    }
  }

  console.log(`\nBitti. ok=${ok} skip=${skip} fail=${fail}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
