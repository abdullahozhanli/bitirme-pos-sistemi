import React from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useNavigate } from 'react-router-dom';
import { TABLE_STATUS, STATUS_LABELS } from '../constants/tableStatus.js';
import { getOrderLineItems } from '../../../shared/utils/orderLineItems';
import { getOrderPaymentDisplayText } from '../../../shared/utils/orderPayment';
import { getTableStatusClass, getTableStatusLabel } from '../../../shared/utils/tableStatusDisplay';
import '../../../shared/components/table/TableDetailPanel.css';

function formatPrice(value) {
  return `₺${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

export default function WaiterTableDetailPanel({
  table,
  statusLabels = STATUS_LABELS,
  onCreateOrder,
  onRefresh,
  onClose,
}) {
  const navigate = useNavigate();
  const statusClass = getTableStatusClass(table.status);
  const statusLabel = getTableStatusLabel(table.status, statusLabels);
  const activeOrders = table.activeOrders || [];
  const allOrders = table.orders || [];
  const totalAmount = activeOrders.reduce((sum, o) => sum + (o.total || o.totalPrice || 0), 0);

  return (
    <aside className={`table-detail-panel ${statusClass}`}>
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

      <section className="table-detail-section">
        <p className="table-detail-section-label">Hızlı İşlemler</p>
        <div className="table-detail-actions">
          {table.status === TABLE_STATUS.AVAILABLE && (
            <button
              type="button"
              className="table-detail-action-primary"
              onClick={() => {
                if (onCreateOrder) onCreateOrder();
                else navigate(`/waiter/orders/create?tableId=${table._id || table.id}`);
              }}
            >
              <AddIcon sx={{ fontSize: 18 }} />
              Yeni Sipariş Al
            </button>
          )}
          {activeOrders.length > 0 && (
            <button
              type="button"
              className="table-detail-action-row"
              onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}`)}
            >
              <ReceiptIcon />
              Siparişleri Gör ({activeOrders.length})
            </button>
          )}
          {table.status === TABLE_STATUS.PAYMENT_PENDING && (
            <button
              type="button"
              className="table-detail-action-primary"
              onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}&payment=true`)}
            >
              <PaymentIcon sx={{ fontSize: 18 }} />
              Ödeme Al
            </button>
          )}
        </div>
      </section>

      <section className="table-detail-section">
        <p className="table-detail-section-label">
          Aktif Siparişler ({activeOrders.length})
        </p>

        {activeOrders.length === 0 ? (
          <div className="table-detail-empty">
            <ReceiptIcon />
            <p>Aktif sipariş bulunmuyor</p>
          </div>
        ) : (
          <div className="table-detail-orders">
            {activeOrders.slice(0, 5).map((order) => {
              const orderId = order._id || order.id;
              const lineItems = getOrderLineItems(order);
              const orderTotal = order.total || order.totalPrice || 0;

              return (
                <article key={orderId} className="table-detail-order-card">
                  <div className="table-detail-order-head">
                    <div>
                      <p className="table-detail-order-id">
                        Sipariş #{orderId?.slice(-6).toUpperCase() || '---'}
                      </p>
                      <p className="table-detail-order-meta">
                        {lineItems.length} ürün · {getOrderPaymentDisplayText(order)}
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
                      onClick={() => navigate(`/waiter/orders?orderId=${orderId}`)}
                    >
                      <ReceiptIcon />
                      Görüntüle
                    </button>
                    <button
                      type="button"
                      className="table-detail-btn"
                      onClick={() => navigate(`/waiter/orders?orderId=${orderId}&edit=true`)}
                    >
                      <EditOutlinedIcon />
                      Düzenle
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {activeOrders.length > 5 && (
          <button
            type="button"
            className="table-detail-action-row"
            onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}`)}
          >
            Tümünü Gör ({activeOrders.length})
          </button>
        )}
      </section>

      {totalAmount > 0 && (
        <div className="table-detail-summary-total">
          <span className="table-detail-total-label">Toplam Tutar</span>
          <span className="table-detail-total-value">{formatPrice(totalAmount)}</span>
        </div>
      )}

      {allOrders.length > 0 && (
        <button
          type="button"
          className="table-detail-history-link"
          onClick={() => navigate(`/waiter/orders?tableId=${table._id || table.id}`)}
        >
          <span>Sipariş Geçmişi ({allOrders.length})</span>
          <span>Görüntüle →</span>
        </button>
      )}
    </aside>
  );
}
