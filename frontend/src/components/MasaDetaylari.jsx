import React from 'react';
import './MasaDetaylari.css';

/**
 * MasaDetaylari - Displays details of selected table
 * 
 * @component
 * @param {Object} selectedMasa - Selected table object
 */
const MasaDetaylari = ({ selectedMasa }) => {
  if (!selectedMasa) {
    return (
      <div className="masa-detaylari-container">
        <h3 className="masa-detaylari-title">Masa Detayları</h3>
        <div className="no-selection">
          <p>Lütfen bir masa seçin</p>
        </div>
      </div>
    );
  }

  // Durum renkleri ve etiketleri
  const durumRenk = {
    müsait: 'available',
    dolu: 'full',
    rezerve: 'reserved',
    available: 'available',
    occupied: 'full',
    reserved: 'reserved'
  };

  const durumLabel = {
    müsait: 'Müsait',
    dolu: 'Dolu',
    rezerve: 'Rezerve',
    available: 'Müsait',
    occupied: 'Dolu',
    reserved: 'Rezerve'
  };

  const masaDurum = selectedMasa.durum || selectedMasa.status || 'müsait';
  const durumClass = durumRenk[masaDurum] || 'available';

  return (
    <div className="masa-detaylari-container">
      <h3 className="masa-detaylari-title">Masa Detayları</h3>
      <div className="masa-detaylari-content">
        <div className="detail-row">
          <span className="detail-label">Masa ID</span>
          <span className="detail-value">{selectedMasa.id || selectedMasa.name}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Masa Numarası</span>
          <span className="detail-value">{selectedMasa.numara || selectedMasa.capacity || '-'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Durumu</span>
          <span className={`status-badge ${durumClass}`}>
            {durumLabel[masaDurum] || masaDurum}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Kapasite</span>
          <span className="detail-value">{selectedMasa.kapasite || selectedMasa.capacity || '-'} kişi</span>
        </div>

        {(selectedMasa.durum === 'dolu' || selectedMasa.status === 'occupied') && 
         (selectedMasa.siparisler?.length > 0 || selectedMasa.openOrders > 0) && (
          <div className="active-orders-section">
            <h4 className="orders-title">
              Aktif Siparişler ({selectedMasa.siparisSayisi || selectedMasa.openOrders || selectedMasa.siparisler?.length || 0})
            </h4>
            {selectedMasa.siparisler && selectedMasa.siparisler.length > 0 ? (
              selectedMasa.siparisler.map((siparis, index) => (
                <div key={index} className="order-card">
                  <div className="order-header">
                    <span className="order-number">{siparis.no || `#${index + 1}`}</span>
                  </div>
                  <div className="order-info">
                    <span>{siparis.urunSayisi || 0} ürün</span>
                    <span className="order-total-amount">₺{siparis.toplam?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-orders">Aktif sipariş bulunmuyor</p>
            )}
          </div>
        )}

        <button className="view-details-btn">Detayları Görüntüle</button>
      </div>
    </div>
  );
};

export default MasaDetaylari;
