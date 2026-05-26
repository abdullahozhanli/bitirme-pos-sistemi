import React from 'react';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import './TableCard.css';

export default function TableCard({ table, isSelected, onClick }) {
  const statusMap = {
    bos: 'available',
    dolu: 'full',
    rezerve: 'reserved',
    odeme_bekliyor: 'payment_pending',
  };

  const statusClass = statusMap[table.status] || 'available';

  const calculateOrderDuration = () => {
    if (!table.hasActiveOrder || !table.activeOrders || table.activeOrders.length === 0) {
      return null;
    }
    
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
  const productCount = activeOrder?.items?.length || table.activeOrderCount || 0;
  const totalPrice = table.totalAmount || 0;

  return (
    <div 
      className={`table-card ${statusClass} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
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
        <div className={`status-dot ${statusClass}`}></div>
      </div>

      <div className="card-bottom-section">
        {table.status === 'dolu' ? (
          <>
            <div className="status-text-large">DOLU</div>
            {table.hasActiveOrder && (
              <>
                <div className="order-number">Sipariş #{orderNumber || '---'}</div>
                <div className="order-summary">
                  {productCount} ürün - {totalPrice.toFixed(2).replace('.', ',')}₺
                  {orderDuration != null ? ` · ${orderDuration}dk` : ''}
                </div>
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

