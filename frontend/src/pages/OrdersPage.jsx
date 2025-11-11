import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/api/orders';
import PageHeader from '@/components/PageHeader';
import OrderList from '@/components/orders/OrderList';
import OrderDrawer from '@/components/orders/OrderDrawer';

/** @typedef {import('@/lib/api/orders').Order} Order */

export default function OrdersPage() {
  const { data = [] } = useQuery({ queryKey: ['orders'], queryFn: getOrders });
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Sipariş Yönetimi" />

      <OrderList
        orders={data}
        onOpen={(o) => {
          setSelected(o);
          setOpen(true);
        }}
      />

      <OrderDrawer order={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
