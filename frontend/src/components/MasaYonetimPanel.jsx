import React, { useState } from 'react';
import './MasaYonetimPanel.css';

/**
 * MasaYonetimPanel component - Restaurant table management panel
 * Displays table cards on the left and selected table details on the right
 * 
 * @component
 * @example
 * <MasaYonetimPanel />
 */
const MasaYonetimPanel = () => {
  // Durum renkleri mapping
  const durumRenk = {
    müsait: 'available',
    dolu: 'full',
    rezerve: 'reserved',
  };

  // Mock masa verileri - görseldeki gibi
  const [masalar] = useState([
    { id: 'Masa 1', numara: 1, kapasite: 8, durum: 'müsait', siparisSayisi: 0, toplamTutar: 0 },
    { id: 'Masa 2', numara: 2, kapasite: 2, durum: 'müsait', siparisSayisi: 0, toplamTutar: 0 },
    { id: 'Masa 3', numara: 3, kapasite: 4, durum: 'dolu', siparisSayisi: 1, toplamTutar: 136.00 },
    { id: 'Masa 4', numara: 4, kapasite: 2, durum: 'rezerve', siparisSayisi: 0, toplamTutar: 0 },
    { id: 'Masa 5', numara: 5, kapasite: 6, durum: 'rezerve', siparisSayisi: 0, toplamTutar: 0 },
  ]);

  const [seciliMasa, setSeciliMasa] = useState(null);
  const [filtre, setFiltre] = useState('tümü');

  // Filtreleme
  const filtrelenmisMasalar = masalar.filter((masa) => {
    if (filtre === 'tümü') return true;
    if (filtre === 'müsait') return masa.durum === 'müsait';
    if (filtre === 'dolu') return masa.durum === 'dolu';
    if (filtre === 'rezerve') return masa.durum === 'rezerve';
    return true;
  });

  // Summary istatistikleri
  const summary = {
    müsait: masalar.filter(m => m.durum === 'müsait').length,
    dolu: masalar.filter(m => m.durum === 'dolu').length,
    rezerve: masalar.filter(m => m.durum === 'rezerve').length,
  };

  // Durum label'ları
  const getDurumLabel = (durum) => {
    const labels = {
      müsait: 'Müsait',
      dolu: 'Dolu',
      rezerve: 'Rezerve',
    };
    return labels[durum] || durum;
  };

  return (
    <div className="container">
      <div className="left-panel">
        <h2>Masa Haritası</h2>
        
        {/* Filtre Butonları */}
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filtre === 'tümü' ? 'active' : ''}`}
            onClick={() => setFiltre('tümü')}
          >
            Tümü
          </button>
          <button
            className={`filter-btn ${filtre === 'müsait' ? 'active' : ''}`}
            onClick={() => setFiltre('müsait')}
          >
            Müsait
          </button>
          <button
            className={`filter-btn ${filtre === 'dolu' ? 'active' : ''}`}
            onClick={() => setFiltre('dolu')}
          >
            Dolu
          </button>
          <button
            className={`filter-btn ${filtre === 'rezerve' ? 'active' : ''}`}
            onClick={() => setFiltre('rezerve')}
          >
            Rezerve
          </button>
        </div>

        {/* Özet Çubuk */}
        <div className="summary-bar">
          <div className="summary-item available">
            <span>{summary.müsait} Müsait</span>
          </div>
          <div className="summary-item full">
            <span>{summary.dolu} Dolu</span>
          </div>
          <div className="summary-item reserved">
            <span>{summary.rezerve} Rezerve</span>
          </div>
        </div>

        <div className="table-grid">
          {filtrelenmisMasalar.map((masa) => (
            <div
              key={masa.id}
              className={`table-card ${durumRenk[masa.durum]} ${seciliMasa?.id === masa.id ? 'selected' : ''}`}
              onClick={() => setSeciliMasa(masa)}
            >
              <div className="status-indicator"></div>
              <h3>{masa.id}</h3>
              <p>{masa.kapasite} kişilik</p>
              <p className="durum-text">{getDurumLabel(masa.durum)}</p>
              {masa.durum === 'dolu' && masa.siparisSayisi > 0 && (
                <div className="order-info">Açık sipariş: {masa.siparisSayisi}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="right-panel">
        <h2 className="detail-header">Masa Detayları</h2>
        {seciliMasa ? (
          <>
            <div className="detail-item">
              <span>Masa ID</span>
              <span>{seciliMasa.id}</span>
            </div>
            <div className="detail-item">
              <span>Masa Numarası</span>
              <span>{seciliMasa.numara}</span>
            </div>
            <div className="detail-item">
              <span>Durum</span>
              <span className={`status-badge ${durumRenk[seciliMasa.durum]}`}>
                {getDurumLabel(seciliMasa.durum)}
              </span>
            </div>
            {seciliMasa.durum === 'dolu' && (
              <div className="active-orders">
                <h3>Aktif Siparişler ({seciliMasa.siparisSayisi})</h3>
                <div className="order-detail-card">
                  <p>Sipariş #1234</p>
                  <p>3 ürün • ₺136.00</p>
                </div>
                <div className="order-detail-card">
                  <p>Sipariş #1235</p>
                  <p>2 ürün • ₺88.00</p>
                </div>
              </div>
            )}
            <button className="view-details-btn">Detayları Görüntüle</button>
          </>
        ) : (
          <p>Lütfen bir masa seçin.</p>
        )}
      </div>
    </div>
  );
};

export default MasaYonetimPanel;

