const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const QRCodeModel = require('../models/QRCode');
const Table = require('../models/Table');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

/**
 * GET /api/qr/generate/:tableNumber
 * QR kod oluşturur (Public - önce veritabanından çek, yoksa oluştur)
 * @access Public
 */
router.get('/generate/:tableNumber', async (req, res, next) => {
  try {
    const { tableNumber } = req.params;
    
    if (!tableNumber) {
      return res.status(400).json({ message: 'Masa numarası gerekli' });
    }

    // Önce veritabanından çek
    let qrCodeDoc = await QRCodeModel.findOne({ tableNumber }).populate('tableId');
    
    if (qrCodeDoc && qrCodeDoc.qrCode) {
      // Veritabanında varsa, base64'ü buffer'a çevir ve döndür
      const base64Data = qrCodeDoc.qrCode.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="qr-table-${tableNumber}.png"`);
      res.send(buffer);
      return;
    }

    // Veritabanında yoksa, yeni oluştur (public erişim için masa oluşturma yok)
    // Dinamik frontend URL: request'ten referer veya hostname kullan
    let frontendOrigin = process.env.FRONTEND_ORIGIN;
    
    // Eğer referer header'ı varsa, ondan frontend URL'ini çıkar
    if (req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer);
        frontendOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      } catch (e) {
        // Referer parse edilemezse devam et
      }
    }
    
    // Eğer hala yoksa, request hostname'inden oluştur (backend port'undan frontend port'una)
    if (!frontendOrigin) {
      const host = req.headers.host || 'localhost:5001';
      const hostname = host.split(':')[0];
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      frontendOrigin = isLocalhost 
        ? 'http://localhost:5173' 
        : `http://${hostname}:5173`;
    }
    
    const qrUrl = `${frontendOrigin}/order?table=${tableNumber}`;

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

    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

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
 * QR kod bilgisini JSON olarak döndürür (base64 data URL) - önce veritabanından çek, yoksa oluştur
 * @access Public
 */
router.get('/generate/:tableNumber/json', async (req, res, next) => {
  try {
    const { tableNumber } = req.params;
    
    if (!tableNumber) {
      return res.status(400).json({ message: 'Masa numarası gerekli' });
    }

    // Önce veritabanından çek
    let qrCodeDoc = await QRCodeModel.findOne({ tableNumber }).populate('tableId');
    
    if (qrCodeDoc) {
      // Veritabanında varsa, onu döndür
      res.json({
        tableNumber: qrCodeDoc.tableNumber,
        qrUrl: qrCodeDoc.qrUrl,
        qrCode: qrCodeDoc.qrCode,
        _id: qrCodeDoc._id,
        tableId: qrCodeDoc.tableId
      });
      return;
    }

    // Veritabanında yoksa, yeni oluştur (public erişim için masa oluşturma yok)
    // Dinamik frontend URL: request'ten referer veya hostname kullan
    let frontendOrigin = process.env.FRONTEND_ORIGIN;
    
    // Eğer referer header'ı varsa, ondan frontend URL'ini çıkar
    if (req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer);
        frontendOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      } catch (e) {
        // Referer parse edilemezse devam et
      }
    }
    
    // Eğer hala yoksa, request hostname'inden oluştur (backend port'undan frontend port'una)
    if (!frontendOrigin) {
      const host = req.headers.host || 'localhost:5001';
      const hostname = host.split(':')[0];
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      frontendOrigin = isLocalhost 
        ? 'http://localhost:5173' 
        : `http://${hostname}:5173`;
    }
    
    const qrUrl = `${frontendOrigin}/order?table=${tableNumber}`;

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

/**
 * GET /api/qr
 * Tüm QR kodları listele (admin)
 * @access Admin
 */
router.get('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const qrCodes = await QRCodeModel.find()
      .populate('tableId', 'name capacity status')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(qrCodes);
  } catch (error) {
    console.error('QR kodları listeleme hatası:', error);
    next(error);
  }
});

/**
 * POST /api/qr
 * QR kod oluştur + masa oluştur (admin)
 * @access Admin
 * Body: { tableNumber: string, capacity?: number }
 */
router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { tableNumber, capacity } = req.body;
    
    if (!tableNumber || !tableNumber.trim()) {
      return res.status(400).json({ message: 'Masa numarası gerekli' });
    }

    const tableNum = String(tableNumber).trim();
    // Capacity'yi kontrol et - eğer yoksa, 0 ise veya geçersizse varsayılan 4 kullan
    let tableCapacity = 4; // Varsayılan
    if (capacity !== undefined && capacity !== null && capacity !== '') {
      const parsedCapacity = Number(capacity);
      if (!isNaN(parsedCapacity) && parsedCapacity > 0) {
        tableCapacity = parsedCapacity;
      }
    }

    // QR kod zaten var mı kontrol et
    const existingQR = await QRCodeModel.findOne({ tableNumber: tableNum });
    if (existingQR) {
      return res.status(400).json({ message: 'Bu masa numarası için QR kod zaten mevcut' });
    }

    // Masa var mı kontrol et
    let table = await Table.findOne({ name: tableNum });
    
    if (!table) {
      // Masa yoksa oluştur
      table = await Table.create({
        name: tableNum,
        capacity: tableCapacity,
        status: 'bos'
      });
      console.log('✅ [QR CREATE /api/qr] Yeni masa oluşturuldu:', { 
        _id: table._id,
        name: table.name, 
        capacity: table.capacity
      });
    } else {
      // Masa varsa capacity'yi güncelle - findByIdAndUpdate kullan (daha güvenilir)
      console.log('🔄 [QR CREATE /api/qr] Mevcut masa bulundu, capacity güncelleniyor:', { 
        _id: table._id,
        oldCapacity: table.capacity, 
        newCapacity: tableCapacity
      });
      table = await Table.findByIdAndUpdate(
        table._id,
        { capacity: tableCapacity },
        { new: true, runValidators: true }
      );
      console.log('✅ [QR CREATE /api/qr] Masa capacity güncellendi:', { 
        _id: table._id,
        name: table.name, 
        capacity: table.capacity
      });
    }

    // Frontend URL'ini oluştur - dinamik olarak request'ten al
    let frontendOrigin = process.env.FRONTEND_ORIGIN;
    
    // Eğer referer header'ı varsa, ondan frontend URL'ini çıkar
    if (req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer);
        frontendOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      } catch (e) {
        // Referer parse edilemezse devam et
      }
    }
    
    // Eğer hala yoksa, request hostname'inden oluştur (backend port'undan frontend port'una)
    if (!frontendOrigin) {
      const host = req.headers.host || 'localhost:5001';
      const hostname = host.split(':')[0];
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      frontendOrigin = isLocalhost 
        ? 'http://localhost:5173' 
        : `http://${hostname}:5173`;
    }
    
    const qrUrl = `${frontendOrigin}/order?table=${tableNum}`;

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

    // QRCode kaydet
    const qrCodeDoc = await QRCodeModel.create({
      tableNumber: tableNum,
      qrUrl,
      qrCode: qrCodeDataURL,
      tableId: table._id,
      createdBy: req.user.id
    });

    // Populate ile döndür
    const populated = await QRCodeModel.findById(qrCodeDoc._id)
      .populate('tableId', 'name capacity status')
      .populate('createdBy', 'name email')
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    console.error('QR kod oluşturma hatası:', error);
    if (error.code === 11000) {
      // Duplicate key error (unique constraint)
      return res.status(400).json({ message: 'Bu masa numarası için QR kod zaten mevcut' });
    }
    next(error);
  }
});

/**
 * PUT /api/qr/:id/regenerate
 * QR kod URL'ini yeniden oluştur (mevcut network'e göre)
 * @access Admin
 */
router.put('/:id/regenerate', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // QRCode'u bul
    const qrCode = await QRCodeModel.findById(id);
    if (!qrCode) {
      return res.status(404).json({ message: 'QR kod bulunamadı' });
    }

    // Dinamik frontend URL: request'ten referer veya hostname kullan
    let frontendOrigin = process.env.FRONTEND_ORIGIN;
    
    if (req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer);
        frontendOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      } catch (e) {
        // Referer parse edilemezse devam et
      }
    }
    
    if (!frontendOrigin) {
      const host = req.headers.host || 'localhost:5001';
      const hostname = host.split(':')[0];
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      frontendOrigin = isLocalhost 
        ? 'http://localhost:5173' 
        : `http://${hostname}:5173`;
    }
    
    const qrUrl = `${frontendOrigin}/order?table=${qrCode.tableNumber}`;

    // Yeni QR kod oluştur
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

    // QRCode'u güncelle
    qrCode.qrUrl = qrUrl;
    qrCode.qrCode = qrCodeDataURL;
    await qrCode.save();

    const populated = await QRCodeModel.findById(qrCode._id)
      .populate('tableId', 'name capacity status')
      .populate('createdBy', 'name email')
      .lean();

    res.json({
      message: 'QR kod başarıyla yenilendi',
      qrCode: populated
    });
  } catch (error) {
    console.error('QR kod yenileme hatası:', error);
    next(error);
  }
});

/**
 * DELETE /api/qr/:id
 * QR kod sil + masa sil (admin)
 * @access Admin
 */
router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // QRCode'u bul
    const qrCode = await QRCodeModel.findById(id);
    if (!qrCode) {
      return res.status(404).json({ message: 'QR kod bulunamadı' });
    }

    // İlgili masayı bul
    const table = await Table.findById(qrCode.tableId);
    if (!table) {
      // Masa yoksa sadece QR kod'u sil
      await QRCodeModel.findByIdAndDelete(id);
      return res.json({ message: 'QR kod silindi (masa zaten yoktu)' });
    }

    // Masada aktif sipariş var mı kontrol et
    const activeOrders = await Order.find({
      table: table._id,
      status: {
        $in: ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'hazirlaniyor', 'serviste']
      }
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        message: 'Masada aktif sipariş var, önce siparişleri tamamlayın',
        activeOrdersCount: activeOrders.length
      });
    }

    // QRCode ve Table'ı sil
    await QRCodeModel.findByIdAndDelete(id);
    await Table.findByIdAndDelete(table._id);

    res.json({ 
      message: 'QR kod ve masa başarıyla silindi',
      deletedQR: id,
      deletedTable: table._id
    });
  } catch (error) {
    console.error('QR kod silme hatası:', error);
    next(error);
  }
});

module.exports = router;

