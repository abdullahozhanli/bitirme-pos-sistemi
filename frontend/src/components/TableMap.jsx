import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faClock, faCheckCircle, faUserFriends } from '@fortawesome/free-solid-svg-icons';
import './AdminPanel.css';

/**
 * TableMap component - Displays a map of restaurant tables with status indicators.
 * Shows table cards on the left and selected table details on the right.
 * 
 * @component
 * @example
 * <TableMap />
 */
export default function TableMap() {
  // Mock masa verileri - orders dizisi ile
  const [mockTables] = useState([
    { 
      id: '1', 
      name: 'Masa 2', 
      capacity: 4, 
      status: 'available', 
      orders: [],
      total: 0
    },
    { 
      id: '2', 
      name: 'Masa 2', 
      capacity: 2, 
      status: 'full', 
      orders: Array(15).fill(null).map((_, i) => `ORD-${1234 + i}`),
      total: 2039.56
    },
    { 
      id: '3', 
      name: 'Masa 4', 
      capacity: 4, 
      status: 'full', 
      orders: Array(15).fill(null).map((_, i) => `ORD-${1234 + i}`),
      total: 2039.56
    },
    { 
      id: '4', 
      name: 'Masa 4', 
      capacity: 4, 
      status: 'available', 
      orders: [],
      total: 0
    },
    { 
      id: '5', 
      name: 'Masa 2', 
      capacity: 2, 
      status: 'full', 
      orders: Array(15).fill(null).map((_, i) => `ORD-${1234 + i}`),
      total: 2039.56
    },
    { 
      id: '6', 
      name: 'Masa 6', 
      capacity: 6, 
      status: 'available', 
      orders: [],
      total: 0
    },
    { 
      id: '7', 
      name: 'Masa 4', 
      capacity: 4, 
      status: 'reserved', 
      orders: [],
      total: 0
    },
    { 
      id: '8', 
      name: 'Masa 4', 
      capacity: 4, 
      status: 'full', 
      orders: Array(15).fill(null).map((_, i) => `ORD-${1234 + i}`),
      total: 2039.56
    },
  ]);

  const [selected, setSelected] = useState(mockTables[4] || mockTables[0] || {});

  // Summary istatistikleri
  const summary = {
    available: mockTables.filter(t => t.status === 'available').length,
    full: mockTables.filter(t => t.status === 'full').length,
    reserved: mockTables.filter(t => t.status === 'reserved').length,
  };

  const getStatusLabel = (status) => {
    const labels = {
      available: 'Müsait',
      full: 'Dolu',
      reserved: 'Rezerve',
    };
    return labels[status] || 'Müsait';
  };

  // Format masa ID as "M-01", "M-02", etc.
  const formatTableId = (id) => {
    const num = parseInt(id);
    return `M-${num.toString().padStart(2, '0')}`;
  };

  // Format masa name - extract capacity from name or use default
  const formatTableName = (table) => {
    // Extract capacity from name like "Masa 2" -> "Masa 2"
    return table.name || `Masa ${table.capacity}`;
  };

  return (
    <div className="admin-panel">
      <div className="container">
        <div className="left-panel">
          <h2>Masa Haritası</h2>
          <p style={{ marginTop: '-10px', marginBottom: '25px', fontSize: '0.9em', color: 'var(--light-text)' }}>
            Tüm masaların anlık durumu
          </p>

          <div className="summary-bar">
            <div className="summary-item available">
              <FontAwesomeIcon icon={faCheckCircle} className="summary-icon" />
              <span>{summary.available} Müsait</span>
            </div>
            <div className="summary-item full">
              <FontAwesomeIcon icon={faExclamationTriangle} className="summary-icon" />
              <span>{summary.full} Dolu</span>
            </div>
            <div className="summary-item reserved">
              <FontAwesomeIcon icon={faClock} className="summary-icon" />
              <span>{summary.reserved} Rezerve</span>
            </div>
          </div>

          <div className="table-grid">
            {mockTables.map((table) => (
              <div
                key={table.id}
                className={`table-card ${table.status} ${
                  selected?.id === table.id ? 'selected' : ''
                }`}
                onClick={() => setSelected(table)}
              >
                <div className="status-indicator"></div>
                <div className="icon-group">
                  <FontAwesomeIcon icon={faUserFriends} />
                  {table.capacity > 2 && (
                    <FontAwesomeIcon icon={faUserFriends} />
                  )}
                </div>
                <h3>{formatTableId(table.id)}</h3>
                <p>{formatTableName(table)}</p>
                {table.status === 'full' && table.orders.length > 0 && (
                  <>
                    <div className="order-info">{table.orders.length} Sipariş</div>
                    <div className="order-info">
                      <span>{table.total.toFixed(2)} TL</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="right-panel">
            <h2 className="detail-header">Masa Detayları</h2>
            <div className="detail-item">
              <span>Masa ID</span>
              <span>{formatTableId(selected.id)}</span>
            </div>
            <div className="detail-item">
              <span>Masa Numarası</span>
              <span>{selected.name?.replace('Masa ', '') || selected.id}</span>
            </div>
            <div className="detail-item">
              <span>Durum</span>
              <span className={`status-badge ${selected.status}`}>
                {getStatusLabel(selected.status)}
              </span>
            </div>

            <div className="active-orders">
              <h3>Aktif Siparişler ({selected.orders?.length || 0})</h3>
              {selected.orders && selected.orders.length > 0 ? (
                selected.orders.slice(0, 2).map((orderId, idx) => {
                  const orderNum = orderId.replace('ORD-', '');
                  return (
                    <div key={orderId} className="order-detail-card">
                      <p>Sipariş #{orderNum}</p>
                      <p>{(idx + 2)} ürün • ₺{(idx === 0 ? 136 : 88)}.00</p>
                    </div>
                  );
                })
              ) : (
                <p className="no-orders">Aktif sipariş bulunmuyor</p>
              )}
            </div>

            <button className="view-details-btn">Detayları Görüntüle</button>
          </div>
        )}
      </div>
    </div>
  );
}
