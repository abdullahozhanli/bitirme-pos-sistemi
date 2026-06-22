import React from 'react';
import { Modal } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PaymentBadge from '../ui/PaymentBadge';
import { canCancelOrderUi, isOrderPaid } from '../../utils/orderPayment';
import {
  formatOrderMoney,
  getOrderLineItems,
  getOrderStatusLabel,
  getOrderTotalAmount,
  splitOrderNotes,
} from '../../utils/orderLineItems';
import './OrderDetailModal.css';

export default function OrderDetailModal({
  open,
  onClose,
  order,
  onMakeReady,
  onMarkPaid,
  onCancelOrder,
}) {
  if (!order) return null;

  const normalizeTr = (text) =>
    String(text || '')
      .replace(/İ/g, 'I')
      .replace(/I/g, 'I')
      .replace(/ı/g, 'i')
      .replace(/i/g, 'i')
      .replace(/Ş/g, 'S')
      .replace(/ş/g, 's')
      .replace(/Ğ/g, 'G')
      .replace(/ğ/g, 'g')
      .replace(/Ü/g, 'U')
      .replace(/ü/g, 'u')
      .replace(/Ö/g, 'O')
      .replace(/ö/g, 'o')
      .replace(/Ç/g, 'C')
      .replace(/ç/g, 'c')
      .toLowerCase();

  const statusNorm = normalizeTr(order.status);
  const isCancelled = statusNorm === 'iptal' || order.status === 'CANCELED';
  const isPreparing =
    statusNorm === 'hazirlaniyor' ||
    order.status === 'CREATED' ||
    order.status === 'IN_PREP' ||
    order.status === 'SENT_TO_KITCHEN';
  const isPaid = isOrderPaid(order);

  const lineItems = getOrderLineItems(order);
  const totalAmount = getOrderTotalAmount(order, lineItems);
  const { customerNote, paymentNote } = splitOrderNotes(order.notes);
  const tableName =
    order.table?.name ||
    order.tableNumber ||
    order.tableId?.name ||
    '—';

  const disabledPaid = isPaid || isCancelled;
  const disabledReady = !isPreparing || !onMakeReady;
  const disabledCancel = isCancelled || !canCancelOrderUi(order) || !onCancelOrder;

  const statusBadgeClass = isCancelled
    ? 'order-detail-status-badge order-detail-status-badge--cancelled'
    : isPaid
      ? 'order-detail-status-badge order-detail-status-badge--paid'
      : 'order-detail-status-badge';

  return (
    <Modal open={open} onClose={onClose} hideBackdrop aria-labelledby="order-detail-title">
      <div className="order-detail-modal-backdrop" onClick={onClose}>
        <div
          className="order-detail-modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="order-detail-modal-header">
            <h2 id="order-detail-title" className="order-detail-modal-title">
              Sipariş Detayı
            </h2>
            <button type="button" className="order-detail-modal-close" onClick={onClose} aria-label="Kapat">
              <CloseIcon sx={{ fontSize: 18 }} />
            </button>
          </header>

          <div className="order-detail-modal-body">
            <div className="order-detail-summary">
              <div className="order-detail-summary-card">
                <span className="order-detail-summary-label">Masa</span>
                <span className="order-detail-summary-value">{tableName}</span>
              </div>
              <div className="order-detail-summary-card">
                <span className="order-detail-summary-label">Durum</span>
                <span className={statusBadgeClass}>
                  <span className="order-detail-status-badge-dot" aria-hidden="true" />
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>
              <div className="order-detail-summary-card order-detail-summary-card--wide">
                <span className="order-detail-summary-label">Toplam</span>
                <span className="order-detail-summary-value order-detail-summary-value--total">
                  {formatOrderMoney(totalAmount)}
                </span>
              </div>
              {order.paymentMethod ? (
                <div className="order-detail-summary-card order-detail-summary-card--wide">
                  <span className="order-detail-summary-label">Ödeme tercihi</span>
                  <div className="order-detail-payment-row">
                    <PaymentBadge order={order} />
                  </div>
                </div>
              ) : null}
            </div>

            <section>
              <h3 className="order-detail-section-title">
                Ürünler ({lineItems.length})
              </h3>
              {lineItems.length === 0 ? (
                <div className="order-detail-empty-items">Ürün bulunamadı</div>
              ) : (
                <div className="order-detail-items">
                  {lineItems.map((line) => (
                    <article key={line.id} className="order-detail-item">
                      <div className="order-detail-item-head">
                        <p className="order-detail-item-name">
                          {line.qty}x {line.name}
                        </p>
                        <div className="order-detail-item-pricing">
                          <span className="order-detail-item-unit">
                            Birim: {formatOrderMoney(line.unitPrice)}
                          </span>
                          <span className="order-detail-item-total">
                            {formatOrderMoney(line.lineTotal)}
                          </span>
                        </div>
                      </div>
                      {line.note ? (
                        <div className="order-detail-item-note">
                          <span className="order-detail-item-note-label">Not:</span>
                          {line.note}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {(customerNote || paymentNote) && (
              <section className="order-detail-notes-block">
                <h3 className="order-detail-section-title">Sipariş Notu</h3>
                {customerNote ? (
                  <p className="order-detail-notes-text">{customerNote}</p>
                ) : null}
                {paymentNote ? (
                  <p className="order-detail-notes-text" style={{ marginTop: customerNote ? 8 : 0 }}>
                    {paymentNote}
                  </p>
                ) : null}
              </section>
            )}

            <footer className="order-detail-modal-footer">
              {onMakeReady ? (
                <button
                  type="button"
                  className="order-detail-btn order-detail-btn--ready"
                  disabled={disabledReady}
                  onClick={() => onMakeReady(order._id || order.id)}
                >
                  Hazır Yap
                </button>
              ) : null}
              {onMarkPaid ? (
                <button
                  type="button"
                  className="order-detail-btn order-detail-btn--pay"
                  disabled={disabledPaid}
                  onClick={() => onMarkPaid(order._id || order.id)}
                >
                  Ödendi Yap
                </button>
              ) : null}
              {onCancelOrder ? (
                <button
                  type="button"
                  className="order-detail-btn order-detail-btn--cancel"
                  disabled={disabledCancel}
                  onClick={() => onCancelOrder(order._id || order.id)}
                >
                  İptal Et
                </button>
              ) : null}
            </footer>
          </div>
        </div>
      </div>
    </Modal>
  );
}
