/**
 * Tüm QRCode kayıtlarını temizler.
 *
 * Kullanım:
 *   cd backend
 *   node scripts/clearQRCodes.js
 *
 * Sadece QRCode koleksiyonunu siler, masalar ve diğer veriler kalır.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('../models/QRCode');

async function run() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI .env dosyasında bulunamadı');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    const count = await QRCode.countDocuments();
    console.log(`📊 Toplam QR kaydı: ${count}`);

    if (count === 0) {
      console.log('ℹ️ Zaten hiç QR kaydı yok');
      await mongoose.disconnect();
      process.exit(0);
    }

    const res = await QRCode.deleteMany({});
    console.log(`🧹 ${res.deletedCount} adet QR kaydı silindi`);

    await mongoose.disconnect();
    console.log('✅ İşlem bitti, bağlantı kapatıldı');
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

run();








