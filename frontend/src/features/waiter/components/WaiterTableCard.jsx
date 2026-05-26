import React from 'react';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import { TABLE_STATUS, STATUS_LABELS, STATUS_CLASS_MAP } from '../constants/tableStatus.js';
import './WaiterTableCard.css';

export default function WaiterTableCard({ table, isSelected, onClick }) {
  const statusClass = STATUS_CLASS_MAP[table.status] || 'available';

  // Aktif siparişin süresini hesapla (dakika)
  const calculateOrderDuration = () => {
    if (!table.hasActiveOrder || !table.activeOrders || table.activeOrders.length === 0) {
      return null;
    }
    
    // En eski aktif siparişi bul
    const oldestOrder = table.activeOrders
      .map(order => new Date(order.createdAt || order.created_at))
      .sort((a, b) => a - b)[0];
    
    if (!oldestOrder) return null;
    
    const now = new Date();
    const diffMs = now - oldestOrder;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    return diffMins;
  };

  const orderDuration = calculateOrderDuration();
  const activeOrder = table.activeOrders && table.activeOrders.length > 0 ? table.activeOrders[0] : null;
  const orderNumber = activeOrder?._id ? activeOrder._id.slice(-4).toUpperCase() : (activeOrder?.orderNumber || '');
  const totalPrice = table.totalAmount || 0;
  
  // Toplam ürün sayısını hesapla (tüm aktif siparişlerdeki ürünler)
  const totalItemCount = table.activeOrders?.reduce((sum, order) => {
    const items = order.orderItems || order.items || [];
    return sum + items.reduce((itemSum, item) => itemSum + (item.qty || 1), 0);
  }, 0) || 0;
  
  // Ödeme bekliyor durumunda geçen süreyi hesapla
  const getPaymentPendingTime = () => {
    if (table.status !== TABLE_STATUS.PAYMENT_PENDING || !activeOrder) return null;
    const orderDate = new Date(activeOrder.createdAt || activeOrder.created_at);
    const now = new Date();
    const diffMs = now - orderDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins}dk`;
    const hours = Math.floor(diffMins / 60);
    return `${hours}sa`;
  };
  
  const paymentPendingTime = getPaymentPendingTime();

  return (
    <div 
      className={`waiter-table-card ${statusClass} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Üst Kısım: Masa Bilgileri */}
      <div className="card-top-section">
        <div className="table-info-main">
          <div className="table-icon-wrapper">
            <TableRestaurantIcon className="table-icon" />
          </div>
          <div className="table-text-info">
            <h2>{table.name}</h2>
            <p className="capacity-text">Kapasite: {table.capacity}</p>
          </div>
        </div>
        {/* Sağ üstte küçük status indicator */}
        <div className={`status-dot ${statusClass}`}></div>
      </div>

      {/* Alt Kısım: Durum Badge ve Sipariş Bilgisi */}
      <div className="card-bottom-section">
        {table.status === TABLE_STATUS.OCCUPIED && (
          <>
            {table.hasActiveOrder && (
              <>
                <div className="order-info-compact">
                  <span className="order-number-compact">Sipariş #{orderNumber || '---'}</span>
                  <span className="order-price-compact">{totalPrice.toFixed(2).replace('.', ',')}₺</span>
                  {orderDuration != null ? (
                    <span className="order-time-compact">{orderDuration}dk</span>
                  ) : null}
                </div>
                {totalItemCount > 0 && (
                  <div className="order-count-compact">{totalItemCount} ürün</div>
                )}
              </>
            )}
            <span className="status-badge status-badge-full">DOLU</span>
          </>
        )}
        {table.status === TABLE_STATUS.AVAILABLE && (
          <span className="status-badge status-badge-available">MÜSAİT</span>
        )}
        {table.status === TABLE_STATUS.RESERVED && (
          <span className="status-badge status-badge-reserved">REZERVE</span>
        )}
        {table.status === TABLE_STATUS.PAYMENT_PENDING && (
          <>
            {paymentPendingTime && (
              <div className="order-info-compact">
                <span className="order-time-compact">Hesap istendi • {paymentPendingTime}</span>
              </div>
            )}
            <span className="status-badge status-badge-payment">ÖDEME BEKLİYOR</span>
          </>
        )}
      </div>
    </div>
  );
}
















