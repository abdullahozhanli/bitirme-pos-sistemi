import React, { useState } from 'react';
import { useGarson } from '../context/GarsonContext';
import { updateTable } from '../lib/api/tables';
import './MasaKart.css';

/**
 * MasaKart - Table card component with waiter assignment functionality
 * 
 * @component
 * @param {Object} masa - Table object
 * @param {Function} onSelect - Callback when table is selected
 */
const MasaKart = ({ masa, onSelect }) => {
  const { garsonlar, garsonAta, getGarsonByMasa } = useGarson();
  const [assigning, setAssigning] = useState(false);
  const garson = getGarsonByMasa(masa.id);

  // Durum renkleri
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

  const masaDurum = masa.durum || masa.status || 'müsait';
  const durumClass = durumRenk[masaDurum] || 'available';

  const handleGarsonAta = async (e) => {
    e?.stopPropagation();
    if (assigning) return;

    // Show selection dialog
    const garsonList = garsonlar.map((g, idx) => `${idx + 1}. ${g.ad} (ID: ${g.id})`).join('\n');
    const input = prompt(
      `Garson seçin:\n\n${garsonList}\n\nGarson ID girin (veya boş bırakın):`
    );

    if (input === null) return; // User cancelled

    const trimmedInput = input.trim();
    
    if (trimmedInput === '') {
      // Remove assignment
      if (garson) {
        garsonAta(masa.id, null);
        await updateTable({ id: masa.id, assigneeId: undefined });
      }
      return;
    }

    // Find waiter by ID
    const selectedGarson = garsonlar.find(g => g.id === trimmedInput || g.id === `staff-${trimmedInput}`);
    
    if (!selectedGarson) {
      alert('Geçersiz garson ID! Lütfen listedeki ID\'lerden birini girin.');
      return;
    }

    setAssigning(true);
    try {
      // Update context
      garsonAta(masa.id, selectedGarson.id);
      // Update API
      await updateTable({ id: masa.id, assigneeId: selectedGarson.id });
    } catch (error) {
      console.error('Garson atama hatası:', error);
      alert('Garson atanırken hata oluştu!');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      className={`masa-kart ${durumClass}`}
      onClick={() => onSelect && onSelect(masa)}
    >
      <div className="masa-kart-header">
        <h3 className="masa-kart-title">{masa.id || masa.name}</h3>
        <span className="masa-kart-kapasite">Kapasite: {masa.kapasite || masa.capacity || 4}</span>
      </div>
      
      <div className={`masa-kart-durum ${durumClass}`}>
        {durumLabel[masaDurum] || 'Müsait'}
      </div>

      <div className="masa-kart-garson">
        <span className="masa-kart-garson-label">Garson:</span>
        <span className="masa-kart-garson-name">
          {garson?.ad || 'Atanmamış'}
        </span>
      </div>

      {(masa.durum === 'dolu' || masa.status === 'occupied') && 
       (masa.siparisSayisi > 0 || masa.openOrders > 0) && (
        <div className="masa-kart-siparis">
          <div className="masa-kart-siparis-count">
            {masa.siparisSayisi || masa.openOrders || 0} Sipariş
          </div>
          {masa.toplamTutar > 0 && (
            <div className="masa-kart-siparis-tutar">
              Toplam: {masa.toplamTutar.toFixed(2)} TL
            </div>
          )}
        </div>
      )}

      <button
        className="masa-kart-garson-btn"
        onClick={handleGarsonAta}
        disabled={assigning}
      >
        {assigning ? 'Atanıyor...' : garson ? 'Garson Değiştir' : 'Garson Ata'}
      </button>
    </div>
  );
};

export default MasaKart;

