import React from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getOrderPaymentDisplayText } from '../../../shared/utils/orderPayment';
import './CashierTableCard.css';

function countItems(orders) {
  return orders.reduce((sum, order) => {
    const items = order.orderItems || order.items || [];
    return sum + items.reduce((n, item) => n + (item.qty || 1), 0);
  }, 0);
}

function paymentTag(orders, prefersCashier, hasPending) {
  if (!hasPending) return { label: 'Müsait', type: 'idle' };
  if (!orders?.length) return { label: 'Ödeme bekliyor', type: 'default' };
  if (orders.some((o) => o.paymentMethod === 'online')) {
    return { label: 'Online ödendi', type: 'done' };
  }
  if (prefersCashier || orders.some((o) => o.paymentMethod === 'cashier')) {
    return { label: 'Kasada öde', type: 'priority' };
  }
  const withMethod = orders.find((o) => o.paymentMethod);
  if (withMethod?.paymentMethod === 'table') {
    return { label: 'Masada öde', type: 'default' };
  }
  if (withMethod) {
    return { label: getOrderPaymentDisplayText(withMethod), type: 'default' };
  }
  return { label: 'Ödeme bekliyor', type: 'default' };
}

export default function CashierTableCard({ table, isSelected, onClick, onPayClick, processing }) {
  const orders = table.orders || [];
  const hasPending =
    Boolean(table.hasPendingPayment) || orderCount > 0 || orders.length > 0;
  const totalAmount = table.totalAmount || 0;
  const orderCount = table.orderCount ?? orders.length;
  const itemCount = countItems(orders);
  const prefersCashier = table.prefersCashier || orders.some((o) => o.paymentMethod === 'cashier');
  const tag = paymentTag(orders, prefersCashier, hasPending);

  const oldestOrder = orders
    .map((o) => new Date(o.createdAt || o.created_at))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b)[0];

  let waitLabel = null;
  if (oldestOrder && hasPending) {
    const mins = Math.floor((Date.now() - oldestOrder) / 60000);
    waitLabel = mins < 60 ? `${mins} dk` : `${Math.floor(mins / 60)} sa`;
  }

  const subParts = hasPending
    ? [
        orderCount > 0 ? `${orderCount} sipariş` : null,
        itemCount > 0 ? `${itemCount} ürün` : null,
        waitLabel,
        table.capacity ? `${table.capacity} kişi` : null,
      ].filter(Boolean)
    : [table.capacity ? `${table.capacity} kişilik` : 'Hesap yok'].filter(Boolean);

  const displayName = String(table.name || '').replace(/^masa\s*/i, '').trim() || table.name;

  return (
    <article
      className={`cashier-bill-row ${hasPending ? 'has-pending' : 'is-idle'} ${isSelected ? 'is-selected' : ''} ${tag.type === 'priority' ? 'is-priority' : ''}`}
      onClick={hasPending ? onClick : undefined}
      role={hasPending ? 'button' : 'article'}
      tabIndex={hasPending ? 0 : undefined}
      onKeyDown={
        hasPending
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="cashier-bill-table-badge" aria-hidden>
        <span className="cashier-bill-table-label">Masa</span>
        <span className="cashier-bill-table-num">{displayName}</span>
      </div>

      <div className="cashier-bill-main">
        <div className="cashier-bill-head">
          <span className={`cashier-bill-tag cashier-bill-tag--${tag.type}`}>{tag.label}</span>
          {hasPending ? <ChevronRightIcon className="cashier-bill-chevron" /> : null}
        </div>
        {subParts.length > 0 ? (
          <p className="cashier-bill-sub">{subParts.join(' · ')}</p>
        ) : null}
      </div>

      <div className="cashier-bill-actions">
        {hasPending ? (
          <>
            <p className="cashier-bill-total">{totalAmount.toFixed(2).replace('.', ',')} ₺</p>
            <button
              type="button"
              className="cashier-bill-pay"
              onClick={(e) => {
                e.stopPropagation();
                onPayClick?.(table);
              }}
              disabled={processing}
            >
              Tahsil et
            </button>
          </>
        ) : (
          <span className="cashier-bill-idle-label">—</span>
        )}
      </div>
    </article>
  );
}
