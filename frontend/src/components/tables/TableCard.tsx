import React from 'react';
import type { Table } from '@/lib/api/tables';
import { cn } from '@/lib/utils';

export default function TableCard({ table, onSelect }: { table: Table; onSelect: (t: Table) => void }) {
  const palette = {
    available: 'bg-green-50/80 border-green-200 text-green-900',
    occupied: 'bg-red-50/80 border-red-200 text-red-900',
    reserved: 'bg-yellow-50/80 border-yellow-200 text-yellow-900',
  } as const;

  return (
    <button
      onClick={() => onSelect(table)}
      className={cn('w-full rounded-2xl border p-4 text-left transition hover:shadow-sm', palette[table.status])}
      aria-label={`${table.name}, ${table.status === 'available' ? 'Müsait' : table.status === 'occupied' ? 'Dolu' : 'Rezerve'}, Kapasite: ${table.capacity} kişi`}
    >
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'size-2 rounded-full',
              table.status === 'available' ? 'bg-green-500' : table.status === 'occupied' ? 'bg-red-500' : 'bg-yellow-500'
            )}
            aria-hidden="true"
          />
          <div className="font-medium truncate">{table.name}</div>
        </div>
        <div className="text-xs text-neutral-600">{table.capacity} kişilik</div>
      </div>

      <div className="mt-1 text-sm text-neutral-800">
        {table.status === 'available' ? 'Müsait' : table.status === 'occupied' ? 'Dolu' : 'Rezerve'}
        {table.openOrders > 0 && <span className="ml-2">• Açık sipariş: {table.openOrders}</span>}
      </div>
    </button>
  );
}

