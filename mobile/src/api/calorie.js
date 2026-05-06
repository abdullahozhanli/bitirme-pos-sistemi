import client from './client';

export async function estimateCalories({ text, imageBase64 }) {
  const payload = {
    text: String(text || '').trim(),
    imageBase64: String(imageBase64 || '').trim(),
  };

  const res = await client.post('/api/calorie/estimate', payload);
  return res.data;
}
