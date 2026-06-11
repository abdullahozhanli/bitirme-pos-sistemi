import React from 'react';
import './TableCard.css';

const STATUS_CLASS = {
  bos: 'available',
  dolu: 'full',
  rezerve: 'reserved',
  odeme_bekliyor: 'payment_pending',
};

const STATUS_LABEL = {
  bos: 'MÜSAİT',
  dolu: 'DOLU',
  rezerve: 'REZERVE',
  odeme_bekliyor: 'ÖDEME',
};

function formatTablePrice(value) {
  return `₺${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function calculateOrderDuration(table) {
  const orders = Array.isArray(table.activeOrders) ? table.activeOrders : [];
  if (!orders.length) return null;

  const oldestOrder = orders
    .map((order) => new Date(order.createdAt || order.created_at))
    .sort((a, b) => a - b)[0];

  if (!oldestOrder || Number.isNaN(oldestOrder.getTime())) return null;

  return Math.floor((Date.now() - oldestOrder.getTime()) / (1000 * 60));
}

function tableHasActiveOrder(table) {
  if (table.hasActiveOrder) return true;
  if (Number(table.activeOrderCount) > 0) return true;
  return Array.isArray(table.activeOrders) && table.activeOrders.length > 0;
}

export default function TableCard({ table, isSelected, onClick }) {
  const statusClass = STATUS_CLASS[table.status] || 'available';
  const statusLabel = STATUS_LABEL[table.status] || 'MÜSAİT';
  const orderDuration = calculateOrderDuration(table);
  const totalPrice = table.totalAmount || 0;
  const hasActiveOrder = tableHasActiveOrder(table);

  return (
    <div
      className={`table-card ${statusClass} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="table-card-header">
        <div className="table-card-title-block">
          <h2 className="table-card-name">{table.name}</h2>
          <p className="table-card-capacity">{table.capacity} Kişilik</p>
        </div>
        <div className={`table-card-badge ${statusClass}`}>
          <span className="table-card-badge-dot" aria-hidden="true" />
          <span className="table-card-badge-text">{statusLabel}</span>
        </div>
      </div>

      <div className="table-card-order">
        <span className="table-card-order-label">Aktif Sipariş</span>
        {hasActiveOrder ? (
          <span className="table-card-order-value">
            {orderDuration != null ? `${orderDuration}dk / ` : ''}
            {formatTablePrice(totalPrice)}
          </span>
        ) : (
          <span className="table-card-order-value table-card-order-empty">Sipariş yok</span>
        )}
      </div>
    </div>
  );
}
