const CONFIDENCE_VALUES = ['low', 'medium', 'high'];
const NUMERIC_FIELDS = ['calories', 'protein', 'carbs', 'fat', 'servingGram'];

const AI_KEY_MISSING_MSG =
  'AI kalori tahmini için GEMINI_API_KEY veya OPENAI_API_KEY tanımlanmalıdır.';

const NUTRITION_SYSTEM_PROMPT =
  'Sen deneyimli bir beslenme uzmanısın. Türkiye restoran ve kafe menü ürünleri için ' +
  'tek porsiyon başına tahmini besin değerleri hesaplarsın. ' +
  'Değerler yalnızca tahminidir; sağlık tavsiyesi verme. ' +
  'Emin değilsen confidence değerini "low" veya "medium" seç. ' +
  'Eksik bilgi varsa makul bir Türkiye restoran porsiyonu varsay; varsayımı nutritionNote içinde kısaca belirt. ' +
  'Negatif sayı kullanma. Yanıtı yalnızca JSON olarak ver, başka metin ekleme. ' +
  'İçerikler (ingredients) kuralları: ' +
  '1) Sadece ürün adı, açıklama ve kategoriye uygun ana malzemeleri yaz; ürün adıyla çelişen malzeme ekleme. ' +
  '2) Örnek: "ızgara köfte" veya "köfte" → dana/kuzu kıyma, soğan, ekmek içi, baharat; tavuk göğsü yazma. ' +
  '3) "tavuk" geçmeyen ürünlerde tavuk malzemesi kullanma; "balık" geçmeyen üründe balık kullanma. ' +
  '4) Et yemeği / köfte / kebap / döner gibi isimlerde kırmızı et veya o yemeğe özgü ana protein kullan. ' +
  '5) Tahmin edilen malzemeler Türk mutfağı ve menü adına uygun olsun; emin değilsen genel malzemeler yaz ve nutritionNote\'da belirt. ' +
  '6) En fazla 8 kısa madde. ' +
  'Beklenen şema: {"calories":number,"protein":number,"carbs":number,"fat":number,' +
  '"servingGram":number,"portionUnit":string,"ingredients":string[],"allergens":string[],' +
  '"confidence":"low"|"medium"|"high","nutritionNote":string}';

function resolveAiProvider() {
  if (String(process.env.GEMINI_API_KEY || '').trim()) return 'gemini';
  if (String(process.env.OPENAI_API_KEY || '').trim()) return 'openai';
  return null;
}

function hasAiProvider() {
  return resolveAiProvider() !== null;
}

/** Markdown code fence ve fazla metni temizleyerek JSON çıkarır */
function extractJsonFromAiContent(content) {
  let raw = String(content || '').trim();
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    raw = fenced[1].trim();
  } else {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function toStringArray(value) {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => String(item).trim()).filter(Boolean);
}

function buildProductUserPrompt(product) {
  const categoryName =
    product?.category && typeof product.category === 'object'
      ? product.category.name
      : '';
  const nutrition = product?.nutrition || {};
  const lines = [
    'Aşağıdaki restoran/kafe ürünü için tek porsiyon başına tahmini besin değerlerini hesapla.',
    'İçerikler listesi mutlaka bu ürün adına ve Türk mutfağına uygun olsun; ürün adıyla çelişen malzeme yazma.',
    '',
    `Ürün adı: ${product.name || ''}`,
  ];

  if (product.description) lines.push(`Açıklama: ${product.description}`);
  if (categoryName) lines.push(`Kategori: ${categoryName}`);
  if (product.price != null && product.price !== '') {
    lines.push(`Fiyat (TL): ${product.price}`);
  }
  if (Array.isArray(nutrition.ingredients) && nutrition.ingredients.length) {
    lines.push(
      `Formda girilmiş içerikler (varsa bunlara öncelik ver, ürün adıyla çelişiyorsa ürün adını esas al): ${nutrition.ingredients.join(', ')}`
    );
  }
  if (nutrition.servingGram != null && nutrition.servingGram !== '') {
    lines.push(`Mevcut porsiyon (g): ${nutrition.servingGram}`);
  }
  if (nutrition.portionUnit) {
    lines.push(`Mevcut porsiyon birimi: ${nutrition.portionUnit}`);
  }

  return lines.join('\n');
}

function readNonNegativeNumber(raw, field, { required = false, defaultValue = 0 } = {}) {
  const value = raw[field];
  if (value === undefined || value === null || value === '') {
    if (required) return { error: `AI yanıtında eksik alan: ${field}` };
    return { value: defaultValue };
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return { error: `AI yanıtında geçersiz değer: ${field}` };
  }
  return { value: num };
}

function sanitizeAiNutritionEstimate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'AI yanıtı geçersiz JSON formatında.' };
  }

  const out = {};

  const caloriesResult = readNonNegativeNumber(raw, 'calories', { required: true });
  if (caloriesResult.error) return { error: caloriesResult.error };
  out.calories = Math.round(caloriesResult.value);

  for (const field of ['protein', 'carbs', 'fat']) {
    const result = readNonNegativeNumber(raw, field);
    if (result.error) return { error: result.error };
    out[field] = Math.round(result.value * 10) / 10;
  }

  const servingResult = readNonNegativeNumber(raw, 'servingGram', { defaultValue: 0 });
  if (servingResult.error) return { error: servingResult.error };
  out.servingGram = Math.round(servingResult.value);

  let confidence = String(raw.confidence || 'medium').toLowerCase();
  if (!CONFIDENCE_VALUES.includes(confidence)) {
    confidence = 'medium';
  }
  out.confidence = confidence;

  out.portionUnit = raw.portionUnit != null ? String(raw.portionUnit).trim() : '';
  out.ingredients = toStringArray(raw.ingredients);
  out.allergens = toStringArray(raw.allergens);
  out.nutritionNote =
    raw.nutritionNote != null ? String(raw.nutritionNote).trim() : '';

  return { estimate: out };
}

module.exports = {
  AI_KEY_MISSING_MSG,
  NUTRITION_SYSTEM_PROMPT,
  CONFIDENCE_VALUES,
  NUMERIC_FIELDS,
  resolveAiProvider,
  hasAiProvider,
  extractJsonFromAiContent,
  buildProductUserPrompt,
  sanitizeAiNutritionEstimate,
};
