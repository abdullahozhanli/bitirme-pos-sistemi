import React from 'react';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import './WaiterTableCard.css';

export default function WaiterTableCard({ table, statusLabels, isSelected, onClick }) {
  const statusMap = {
    bos: 'available',
    dolu: 'full',
    rezerve: 'reserved',
    odeme_bekliyor: 'payment_pending',
  };

  const statusClass = statusMap[table.status] || 'available';

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
  const displayTime = orderDuration !== null ? `${orderDuration}dk` : '';
  const displayPrice = table.totalAmount ? table.totalAmount.toFixed(2) : '0,00';
  
  // Sipariş bilgilerini hazırla
  const activeOrder = table.activeOrders && table.activeOrders.length > 0 ? table.activeOrders[0] : null;
  const orderNumber = activeOrder?._id ? activeOrder._id.slice(-4).toUpperCase() : (activeOrder?.orderNumber || '');
  const orderCount = table.activeOrders?.length || table.activeOrderCount || 0;
  const totalPrice = table.totalAmount || 0;

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

      {/* Alt Kısım: Durum ve Sipariş Bilgisi */}
      <div className="card-bottom-section">
        {table.status === 'dolu' ? (
          <>
            <div className="status-text-large">DOLU</div>
            {table.hasActiveOrder && (
              <>
                <div className="order-number">Sipariş #{orderNumber || '---'}</div>
                <div className="order-summary">{orderCount} sipariş - {totalPrice.toFixed(2).replace('.', ',')}₺</div>
              </>
            )}
          </>
        ) : table.status === 'bos' ? (
          <div>MÜSAİT</div>
        ) : table.status === 'rezerve' ? (
          <div>REZERVE</div>
        ) : table.status === 'odeme_bekliyor' ? (
          <div>ÖDEME BEKLİYOR</div>
        ) : null}
      </div>
    </div>
  );
}
















