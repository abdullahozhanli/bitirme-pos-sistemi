import React from 'react';
import { IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import './TableCard.css';

export default function TableCard({ table, statusLabels, isSelected, onClick, onEdit }) {
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

  return (
    <div 
      className={`table-card ${statusClass} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Düzenle Butonu */}
      {onEdit && (
        <IconButton
          className="edit-button"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )}

      {/* Dolu masalar için özel tasarım */}
      {table.status === 'dolu' ? (
        <>
          {/* Üst Kısım: Masa Adı ve Durum Etiketi */}
          <div className="card-header">
            <div className="table-info">
              <h2>{table.name}</h2>
              <p>{table.capacity} Kişilik</p>
            </div>
            
            <div className="status-badge">
              <span className="dot"></span>
              DOLU
            </div>
          </div>

          {/* Alt Kısım: Sipariş Bilgisi */}
          {table.hasActiveOrder && (
            <div className="card-footer">
              <span className="active-order-label">Aktif Sipariş</span>
              <span className="active-order-value">
                {displayTime} / ₺{displayPrice.replace('.', ',')}
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Diğer durumlar için basit tasarım */}
          <div className="status-indicator" />
          <div className="table-info-simple">
            <h2>{table.name}</h2>
            <p>{table.capacity} Kişilik</p>
          </div>
          {table.hasActiveOrder && (
            <div className="card-footer-simple">
              <span className="active-order-label">Aktif Sipariş</span>
              <span className="active-order-value">
                {table.activeOrderCount} Sipariş • ₺{table.totalAmount?.toFixed(2).replace('.', ',') || '0,00'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
















