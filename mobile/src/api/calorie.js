import client from './client';

export async function estimateCalories({ text, imageBase64 }) {
  const payload = {
    text: String(text || '').trim(),
    imageBase64: String(imageBase64 || '').trim(),
  };

  const res = await client.post('/api/calorie/estimate', payload);
  return res.data;
}

export async function sendNutritionChat({ branchId, message, history, cartItems }) {
  const res = await client.post('/api/calorie/chat', {
    branchId: String(branchId || '').trim(),
    message: String(message || '').trim(),
    history: Array.isArray(history) ? history : [],
    cartItems: Array.isArray(cartItems) ? cartItems : [],
  });
  return res.data;
}
