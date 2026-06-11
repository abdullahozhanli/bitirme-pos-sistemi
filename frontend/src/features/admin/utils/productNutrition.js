export const EMPTY_NUTRITION = {
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  servingGram: '',
  portionUnit: '',
  ingredients: '',
  allergens: '',
  nutritionNote: '',
  confidence: '',
  source: 'manual',
  isNutritionVisibleToCustomer: false,
};

export const NUTRITION_NUM_KEYS = ['calories', 'protein', 'carbs', 'fat', 'servingGram'];

export const AI_ESTIMATE_SUCCESS_MSG =
  'AI tahmini oluşturuldu. Bu değer müşteriye henüz gösterilmiyor. Sonucu kontrol ettikten sonra "Besin değerini müşteriye göster" seçeneğini açıp kaydedebilirsiniz.';

export const AI_ESTIMATE_PREVIEW_SUCCESS_MSG =
  'AI tahmini form alanlarına yazıldı. Bu değer müşteriye henüz gösterilmiyor. Sonucu kontrol ettikten sonra "Besin değerini müşteriye göster" seçeneğini açıp ürünü kaydedebilirsiniz.';

const NUTRITION_STATUS_LABELS = {
  none: 'Besin bilgisi yok',
  pending: 'Onay bekliyor',
  estimated: 'AI tahmini oluşturuldu',
  approved: 'Onaylandı',
};

const NUTRITION_SOURCE_LABELS = {
  manual: 'Manuel giriş',
  ai_estimate: 'AI tahmini',
  api_estimate: 'API tahmini',
};

/** Admin formunda gösterilecek durum metni (teknik enum gizli) */
export function nutritionStatusDisplayLabel(status, nutrition) {
  const s = String(status || 'none');
  if (s === 'none' && hasMeaningfulNutrition(nutrition)) {
    return 'Taslak besin bilgisi';
  }
  return NUTRITION_STATUS_LABELS[s] || NUTRITION_STATUS_LABELS.none;
}

/** Admin formunda gösterilecek kaynak metni */
export function nutritionSourceDisplayLabel(source) {
  return NUTRITION_SOURCE_LABELS[String(source || 'manual')] || NUTRITION_SOURCE_LABELS.manual;
}

/** Durum satırının altındaki kısa açıklama */
export function nutritionStatusSubtext(status, visible, nutrition) {
  const s = String(status || 'none');
  if (visible && s === 'approved') {
    return 'Bu değer müşteri menüsünde gösterilebilir.';
  }
  if (s === 'approved' && !visible) {
    return 'Besin değeri onaylı ancak müşteriye henüz gösterilmiyor.';
  }
  if (s === 'estimated') {
    return 'Bu değer müşteriye henüz gösterilmiyor.';
  }
  if (s === 'pending') {
    return 'Onay bekliyor; müşteriye henüz gösterilmiyor.';
  }
  if (hasMeaningfulNutrition(nutrition)) {
    return 'Bu değer müşteriye henüz gösterilmiyor.';
  }
  return '';
}

/** Switch altındaki yardım metni */
export function nutritionVisibilityHint(visible) {
  return visible
    ? 'Kaydettiğinizde besin değerleri müşteri menüsünde yayınlanır.'
    : 'Bu değerler yalnızca admin panelinde görünür.';
}

/** Formda anlamlı besin verisi var mı? */
export function hasMeaningfulNutrition(n) {
  if (!n || typeof n !== 'object') return false;
  const hasNum = NUTRITION_NUM_KEYS.some((k) => {
    const v = Number(n[k]);
    return Number.isFinite(v) && v > 0;
  });
  return (
    hasNum ||
    Boolean(n.ingredients?.trim()) ||
    Boolean(n.allergens?.trim()) ||
    Boolean(n.nutritionNote?.trim())
  );
}

/** Kayıt öncesi nutritionStatus: müşteriye göster switch'ine göre */
export function resolveNutritionStatusForSave(nutrition, previousStatus = 'none') {
  const visible = Boolean(nutrition?.isNutritionVisibleToCustomer);
  const hasCalories = Number(nutrition?.calories) > 0;
  const hasData = hasMeaningfulNutrition(nutrition);

  if (visible && hasCalories) return 'approved';
  if (!hasData) return 'none';

  if (!visible) {
    if (
      previousStatus === 'approved' ||
      previousStatus === 'estimated' ||
      previousStatus === 'pending'
    ) {
      return previousStatus;
    }
    return 'estimated';
  }

  return 'estimated';
}

/** Form state'indeki nutrition'ı backend payload'ına çevirir */
export function toNutritionPayload(n) {
  if (!n) return undefined;
  const out = {};
  for (const k of NUTRITION_NUM_KEYS) {
    if (n[k] !== '' && n[k] != null) out[k] = Number(n[k]);
  }
  if (n.portionUnit?.trim()) out.portionUnit = n.portionUnit.trim();
  if (n.nutritionNote?.trim()) out.nutritionNote = n.nutritionNote.trim();
  if (n.ingredients?.trim()) out.ingredients = n.ingredients;
  if (n.allergens?.trim()) out.allergens = n.allergens;
  if (n.confidence) out.confidence = n.confidence;

  if (Object.keys(out).length === 0) return undefined;

  if (n.source) out.source = n.source;
  out.isNutritionVisibleToCustomer = Boolean(n.isNutritionVisibleToCustomer);
  return out;
}

/** Backend nutrition → form alanları */
export function nutritionToForm(n) {
  if (!n || typeof n !== 'object') return { ...EMPTY_NUTRITION };
  return {
    calories: n.calories ?? '',
    protein: n.protein ?? '',
    carbs: n.carbs ?? '',
    fat: n.fat ?? '',
    servingGram: n.servingGram ?? '',
    portionUnit: n.portionUnit || '',
    ingredients: Array.isArray(n.ingredients) ? n.ingredients.join(', ') : (n.ingredients || ''),
    allergens: Array.isArray(n.allergens) ? n.allergens.join(', ') : (n.allergens || ''),
    nutritionNote: n.nutritionNote || '',
    confidence: n.confidence || '',
    source: n.source || 'manual',
    isNutritionVisibleToCustomer: Boolean(n.isNutritionVisibleToCustomer),
  };
}

/** Tablo chip metni */
export function nutritionStatusLabel(status, nutrition) {
  const s = String(status || 'none');
  if (s === 'approved' && nutrition?.isNutritionVisibleToCustomer) return 'Yayında';
  if (s === 'estimated' || s === 'pending') return 'Taslak';
  if (hasMeaningfulNutrition(nutrition)) return 'Taslak';
  return 'Yok';
}
