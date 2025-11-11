import React from 'react';
import { useGarson } from '../context/GarsonContext';
import './GarsonListesi.css';

/**
 * GarsonListesi - Displays list of waiters with their assigned tables
 * 
 * @component
 * @param {Function} onSelect - Callback when a waiter is selected
 */
const GarsonListesi = ({ onSelect }) => {
  const { garsonlar, loading } = useGarson();

  if (loading) {
    return (
      <div className="garson-listesi-container">
        <h3 className="garson-listesi-title">Garsonlar</h3>
        <div className="garson-loading">Yükleniyor...</div>
      </div>
    );
  }

  if (garsonlar.length === 0) {
    return (
      <div className="garson-listesi-container">
        <h3 className="garson-listesi-title">Garsonlar</h3>
        <div className="garson-empty">Garson bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="garson-listesi-container">
      <div className="garson-list">
        {garsonlar.map((garson) => (
          <div
            key={garson.id}
            className="garson-item"
            onClick={() => onSelect && onSelect(garson)}
          >
            <div className="garson-header">
              <span className="garson-name">{garson.ad}</span>
              <span className="garson-masa-count">
                {garson.aktifMasalar.length} masa
              </span>
            </div>
            {garson.aktifMasalar.length > 0 && (
              <div className="garson-masalar">
                <div className="garson-masalar-label">Aktif Masalar:</div>
                <div className="garson-masalar-list">
                  {garson.aktifMasalar.map((masaId) => (
                    <span key={masaId} className="garson-masa-badge">
                      {masaId}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GarsonListesi;

