import React from 'react';
import { ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentsIcon from '@mui/icons-material/Payments';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  formatOrderMoney,
  getOrderLineItems,
  getOrderTotalAmount,
} from '../../../shared/utils/orderLineItems';
import { getOrderPaymentDisplayText } from '../../../shared/utils/orderPayment';
import '../../../shared/components/table/TableDetailPanel.css';

const STATUS_LABELS = {
  bos: 'MÜSAİT',
  dolu: 'DOLU',
  rezerve: 'REZERVE',
  odeme_bekliyor: 'ÖDEME',
};

const STATUS_CLASS = {
  bos: 'available',
  dolu: 'full',
  rezerve: 'reserved',
  odeme_bekliyor: 'payment_pending',
};

function formatPrice(value) {
  return `₺${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function getOrderTotal(order) {
  const lines = getOrderLineItems(order);
  if (lines.length > 0) {
    return lines.reduce((sum, line) => sum + line.lineTotal, 0);
  }
  return getOrderTotalAmount(order, lines);
}

function getEffectiveStatus(table) {
  if (table.hasPendingPayment) return 'odeme_bekliyor';
  return table.status || 'bos';
}

export default function CashierTableDetailPanel({
  table,
  payMethod,
  onPayMethodChange,
  processing,
  onCheckout,
  onViewOrder,
  onPayOrder,
  onCancelOrder,
  onRefresh,
  onClose,
}) {
  const orders = table.orders || [];
  const totalAmount = table.totalAmount ?? orders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const hasPending = Boolean(table.hasPendingPayment && orders.length > 0);
  const effectiveStatus = getEffectiveStatus(table);
  const statusClass = STATUS_CLASS[effectiveStatus] || 'available';
  const statusLabel = STATUS_LABELS[effectiveStatus] || 'MÜSAİT';

  return (
    <aside
      className={`table-detail-panel ${statusClass} ${table.prefersCashier ? 'priority' : ''}`}
    >
      <div className="table-detail-panel-header">
        <h2 className="table-detail-panel-title">Masa Detayları</h2>
        <div className="table-detail-panel-actions-top">
          <button type="button" className="table-detail-icon-btn" onClick={onRefresh} title="Yenile">
            <RefreshIcon sx={{ fontSize: 18 }} />
          </button>
          {onClose && (
            <button type="button" className="table-detail-icon-btn" onClick={onClose} title="Kapat">
              <CloseIcon sx={{ fontSize: 18 }} />
            </button>
          )}
        </div>
      </div>

      <div className="table-detail-hero">
        <div className="table-detail-hero-text">
          <h3 className="table-detail-table-name">{table.name}</h3>
          <p className="table-detail-capacity">{table.capacity} Kişilik</p>
        </div>
        <div className={`table-detail-badge ${statusClass}`}>
          <span className="table-detail-badge-dot" aria-hidden="true" />
          <span className="table-detail-badge-text">{statusLabel}</span>
        </div>
      </div>

      {table.prefersCashier && (
        <div className="table-detail-priority-banner">
          <InfoOutlinedIcon sx={{ fontSize: 18 }} />
          Müşteri kasada ödemeyi tercih etti
        </div>
      )}

      <section className="table-detail-section">
        <p className="table-detail-section-label">
          Bekleyen Siparişler ({orders.length})
        </p>

        {orders.length === 0 ? (
          <div className="table-detail-empty">
            <ReceiptIcon />
            <p>Sipariş yok</p>
          </div>
        ) : (
          <div className="table-detail-orders">
            {orders.map((order, index) => {
              const orderId = order._id || order.id;
              const lineItems = getOrderLineItems(order);
              const orderTotal = getOrderTotal(order);

              return (
                <article key={orderId || index} className="table-detail-order-card">
                  <div className="table-detail-order-head">
                    <div>
                      <p className="table-detail-order-id">
                        Sipariş #{orderId?.slice(-6).toUpperCase() || '---'}
                      </p>
                      <p className="table-detail-order-meta">
                        {new Date(order.createdAt || order.created_at).toLocaleString('tr-TR')}
                        {order.paymentMethod ? ` · ${getOrderPaymentDisplayText(order)}` : ''}
                      </p>
                    </div>
                    <span className="table-detail-order-total">{formatPrice(orderTotal)}</span>
                  </div>

                  {lineItems.length > 0 && (
                    <div className="table-detail-order-items">
                      {lineItems.map((line) => (
                        <div key={line.id} className="table-detail-order-line">
                          <span className="table-detail-order-item">
                            {line.qty}x {line.name}
                            <span className="table-detail-order-item-price">
                              {formatPrice(line.lineTotal)}
                            </span>
                          </span>
                          {line.note ? (
                            <span className="table-detail-order-item-note">Not: {line.note}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="table-detail-order-actions">
                    <button
                      type="button"
                      className="table-detail-btn"
                      onClick={() => onViewOrder(order)}
                    >
                      <VisibilityIcon />
                      Detay
                    </button>
                    <button
                      type="button"
                      className="table-detail-btn table-detail-btn--primary"
                      onClick={() => onPayOrder(orderId)}
                      disabled={processing}
                    >
                      <PaymentIcon />
                      Tekil Öde
                    </button>
                    <button
                      type="button"
                      className="table-detail-btn table-detail-btn--danger"
                      onClick={() => onCancelOrder(orderId)}
                      disabled={processing}
                    >
                      <CancelIcon />
                      İptal
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {hasPending && (
        <section className="table-detail-checkout">
          <div className="table-detail-total-row">
            <span className="table-detail-total-label">Tahsil edilecek toplam</span>
            <span className="table-detail-total-value">{formatPrice(totalAmount)}</span>
          </div>

          <p className="table-detail-method-label">Ödeme yöntemi</p>
          <div className="table-detail-method-group">
            <ToggleButtonGroup
              value={payMethod}
              exclusive
              onChange={(_, v) => v && onPayMethodChange(v)}
              fullWidth
            >
              <ToggleButton value="cash">
                <PaymentsIcon sx={{ fontSize: 18 }} />
                Nakit
              </ToggleButton>
              <ToggleButton value="card">
                <CreditCardIcon sx={{ fontSize: 18 }} />
                Kart
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          <button
            type="button"
            className="table-detail-checkout-btn"
            onClick={onCheckout}
            disabled={processing}
          >
            {processing ? (
              <CircularProgress size={20} sx={{ color: '#ffffff' }} />
            ) : (
              <PaymentIcon sx={{ fontSize: 20 }} />
            )}
            {processing ? 'İşleniyor...' : 'Tümünü Tahsil Et'}
          </button>
        </section>
      )}
    </aside>
  );
}
