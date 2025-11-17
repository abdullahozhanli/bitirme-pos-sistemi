import axios from 'axios';

export type Kpis = {
  revenue: number;
  orders: number;
  pending: number;
  canceled: number;
  yesterday?: {
    revenue: number;
    orders: number;
    canceled: number;
  };
  lastWeek?: {
    orders: number;
  };
  thisWeek?: {
    orders: number;
  };
};

export async function getKpis(): Promise<Kpis> {
  try {
    console.log('📊 getKpis() çağrıldı - /api/admin/stats/today endpoint\'ine istek gönderiliyor...');
    const response = await axios.get('/api/admin/stats/today');
    console.log('📊 getKpis() yanıtı:', response.data);
    const data = response.data;
    
    // Debug: data.today kontrolü
    console.log('🔍 data.today kontrolü:', {
      'data.today': data.today,
      'data.today?.revenue': data.today?.revenue,
      'data.today?.orders': data.today?.orders,
      'data.today?.pending': data.today?.pending,
      'data.today?.canceled': data.today?.canceled,
    });
    
    // Backend'den gelen yeni formatı eski formata uyarla (geriye dönük uyumluluk)
    const result = {
      revenue: data.today?.revenue ?? 0,
      orders: data.today?.orders ?? 0,
      pending: data.today?.pending ?? 0,
      canceled: data.today?.canceled ?? 0,
      yesterday: data.yesterday,
      lastWeek: data.lastWeek,
      thisWeek: data.thisWeek,
    };
    console.log('📊 getKpis() dönen veri:', result);
    return result;
  } catch (error) {
    console.error('❌ KPI verileri alınamadı:', error);
    throw new Error('KPI verileri alınamadı.');
  }
}


