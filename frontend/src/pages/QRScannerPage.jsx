import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useCart } from '../context/CartContext';
import './QRScannerPage.css';

export default function QRScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const navigate = useNavigate();
  const { setTableNumber } = useCart();

  // QR kod içinden masa numarasını parse et
  const parseTableNumber = (qrText) => {
    try {
      // URL formatı: http://localhost:5173/order?table=5
      const url = new URL(qrText);
      const tableParam = url.searchParams.get('table');
      if (tableParam) {
        return tableParam;
      }
      
      // Direkt masa numarası olabilir
      if (/^\d+$/.test(qrText.trim())) {
        return qrText.trim();
      }
      
      return null;
    } catch (e) {
      // URL değilse direkt sayı olabilir
      if (/^\d+$/.test(qrText.trim())) {
        return qrText.trim();
      }
      return null;
    }
  };

  // QR kod okutma başlat
  const startScanning = async () => {
    try {
      setError('');
      setMessage('Kamera açılıyor...');

      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Arka kamera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText, decodedResult) => {
          // QR kod başarıyla okundu
          handleQRCodeScanned(decodedText);
        },
        (errorMessage) => {
          // Hata mesajı (genellikle okutma devam ederken görünür)
          // Sessizce devam et
        }
      );

      setScanning(true);
      setMessage('QR kodu kameraya gösterin');
    } catch (err) {
      console.error('Kamera hatası:', err);
      setError('Kamera erişimi sağlanamadı. Lütfen kamera iznini kontrol edin.');
      setScanning(false);
      setMessage('');
    }
  };

  // QR kod okutma durdur
  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
      setScanning(false);
      setMessage('');
    } catch (err) {
      console.error('Kamera durdurma hatası:', err);
    }
  };

  // QR kod okutulduğunda
  const handleQRCodeScanned = (qrText) => {
    console.log('QR kod okundu:', qrText);
    const tableNum = parseTableNumber(qrText);
    console.log('Parse edilen masa numarası:', tableNum);
    
    if (!tableNum) {
      setError('Geçersiz QR kod. Lütfen masanızdaki QR kodu okutun.');
      return;
    }

    // Masa numarasını kaydet
    console.log('Masa numarası kaydediliyor:', tableNum);
    setTableNumber(tableNum);
    
    // localStorage'ı kontrol et
    const stored = localStorage.getItem('tableNumber');
    console.log('localStorage tableNumber:', stored);
    
    setMessage(`Masa ${tableNum} seçildi. Menüye yönlendiriliyorsunuz...`);
    
    // Kısa bir gecikme sonrası menüye yönlendir
    setTimeout(() => {
      stopScanning();
      navigate('/');
    }, 1000);
  };

  // Component unmount olduğunda kamerayı kapat
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="qr-scanner-page">
      <div className="qr-scanner-container">
        <h1 className="qr-scanner-title">QR Kod Okutun</h1>
        <p className="qr-scanner-subtitle">
          Masanızdaki QR kodu kameraya gösterin
        </p>

        {/* QR Kod Okutma Alanı */}
        <div className="qr-reader-wrapper">
          <div id="qr-reader" ref={scannerRef}></div>
        </div>

        {/* Mesaj ve Hata Alanı */}
        {message && (
          <div className={`qr-message ${error ? 'error' : 'info'}`}>
            {message}
          </div>
        )}

        {error && !message && (
          <div className="qr-message error">
            {error}
          </div>
        )}

        {/* Kontrol Butonları */}
        <div className="qr-controls">
          {!scanning ? (
            <button
              className="qr-button qr-button-primary"
              onClick={startScanning}
            >
              QR Kod Okut
            </button>
          ) : (
            <button
              className="qr-button qr-button-secondary"
              onClick={stopScanning}
            >
              Durdur
            </button>
          )}
          
          <button
            className="qr-button qr-button-link"
            onClick={() => navigate('/')}
          >
            Menüye Dön
          </button>
        </div>
      </div>
    </div>
  );
}

