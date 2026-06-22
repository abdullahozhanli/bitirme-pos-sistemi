import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ConfirmDialog from '../../../shared/components/ui/ConfirmDialog.jsx';
import { getOrderLineItems } from '../../../shared/utils/orderLineItems';
import { getOrderPaymentDisplayText } from '../../../shared/utils/orderPayment';
import { getTableStatusClass, getTableStatusLabel } from '../../../shared/utils/tableStatusDisplay';
import '../../../shared/components/table/TableDetailPanel.css';

function formatPrice(value) {
  return `₺${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

export default function TableDetailPanel({ table, statusLabels, onEdit, onDelete, onRefresh }) {
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  const statusClass = getTableStatusClass(table.status);
  const statusLabel = getTableStatusLabel(table.status, statusLabels);
  const activeOrders = table.activeOrders || [];
  const allOrders = table.orders || [];
  const totalAmount = table.totalAmount || activeOrders.reduce((sum, o) => sum + (o.total || o.totalPrice || 0), 0);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {};

      await axios.delete(`/api/admin/tables/${table._id}`, { headers });
      setDeleteConfirm(false);
      onDelete();
    } catch (err) {
      console.error('Masa silinemedi:', err);
      alert(err.response?.data?.message || 'Masa silinirken bir hata oluştu');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <aside className={`table-detail-panel ${statusClass}`}>
        <div className="table-detail-panel-header">
          <h2 className="table-detail-panel-title">Masa Detayları</h2>
          <div className="table-detail-panel-actions-top">
            <button type="button" className="table-detail-icon-btn" onClick={onRefresh} title="Yenile">
              <RefreshIcon sx={{ fontSize: 18 }} />
            </button>
            <button type="button" className="table-detail-icon-btn" onClick={onEdit} title="Düzenle">
              <EditIcon sx={{ fontSize: 18 }} />
            </button>
            <button
              type="button"
              className="table-detail-icon-btn table-detail-icon-btn--danger"
              disabled={deleting}
              onClick={() => setDeleteConfirm(true)}
              title="Sil"
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
            </button>
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
                  <article
                    key={orderId}
                    className="table-detail-order-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/siparisler?orderId=${orderId}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/admin/siparisler?orderId=${orderId}`);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
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
                  </article>
                );
              })}
            </div>
          )}

          {activeOrders.length > 5 && (
            <button
              type="button"
              className="table-detail-action-row"
              onClick={() => navigate(`/admin/siparisler?tableId=${table._id}`)}
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
            onClick={() => navigate(`/admin/siparisler?tableId=${table._id}`)}
          >
            <span>Sipariş Geçmişi ({allOrders.length})</span>
            <span>Tümünü Gör →</span>
          </button>
        )}
      </aside>

      <ConfirmDialog
        open={deleteConfirm}
        title="Masa Sil"
        description={`"${table.name}" adlı masayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        confirmText="Sil"
        cancelText="İptal"
      />
    </>
  );
}
