const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

/**
 * GET /api/qr/generate/:tableNumber
 * QR kod oluşturur
 * @access Public
 */
router.get('/generate/:tableNumber', async (req, res, next) => {
  try {
    const { tableNumber } = req.params;
    
    if (!tableNumber) {
      return res.status(400).json({ message: 'Masa numarası gerekli' });
    }

    // Frontend URL'ini oluştur
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const qrUrl = `${frontendOrigin}/order?table=${tableNumber}`;

    // QR kod oluştur (PNG formatında base64)
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });

    // Base64'ü buffer'a çevir
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // PNG olarak döndür
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-table-${tableNumber}.png"`);
    res.send(buffer);

  } catch (error) {
    console.error('QR kod oluşturma hatası:', error);
    next(error);
  }
});

/**
 * GET /api/qr/generate/:tableNumber/json
 * QR kod bilgisini JSON olarak döndürür (base64 data URL)
 * @access Public
 */
router.get('/generate/:tableNumber/json', async (req, res, next) => {
  try {
    const { tableNumber } = req.params;
    
    if (!tableNumber) {
      return res.status(400).json({ message: 'Masa numarası gerekli' });
    }

    // Frontend URL'ini oluştur
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const qrUrl = `${frontendOrigin}/order?table=${tableNumber}`;

    // QR kod oluştur (base64 data URL)
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });

    res.json({
      tableNumber,
      qrUrl,
      qrCode: qrCodeDataURL
    });

  } catch (error) {
    console.error('QR kod oluşturma hatası:', error);
    next(error);
  }
});

module.exports = router;

