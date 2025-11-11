export type Kpis = { revenue: number; orders: number; pending: number; canceled: number };

export async function getKpis(): Promise<Kpis> {
  await new Promise((r) => setTimeout(r, 800));
  // 10% failure to test error UI
  if (Math.random() < 0.1) {
    throw new Error('KPI verileri alınamadı.');
  }
  // Simple mock numbers
  const revenue = 1000 + Math.floor(Math.random() * 5000);
  const orders = 10 + Math.floor(Math.random() * 90);
  const pending = Math.floor(Math.random() * 20);
  const canceled = Math.floor(Math.random() * 10);
  return { revenue, orders, pending, canceled };
}


