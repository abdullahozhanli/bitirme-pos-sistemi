export interface Order {
  _id: string;
  id?: string;
  table?: { name: string; capacity?: number };
  waiter?: { name: string; email: string; role?: string };
  items?: Array<{
    menuItem?: { name: string; price: number; category?: string };
    name: string;
    qty: number;
    price: number;
    note?: string;
  }>;
  total: number;
  status: 'hazirlaniyor' | 'serviste' | 'tamamlandi' | 'iptal';
  createdAt?: string;
  updatedAt?: string;
}

export async function getOrders(): Promise<Order[]> {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};
  
  const response = await fetch('/api/admin/orders', { headers });
  if (!response.ok) {
    throw new Error('Siparişler yüklenemedi');
  }
  
  const data = await response.json();
  const ordersList = Array.isArray(data) ? data : (data.items || []);
  return ordersList.map((o: any) => ({ id: o._id, ...o }));
}

