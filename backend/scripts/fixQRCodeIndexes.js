/**
 * QRCode koleksiyonundaki eski unique index'i düzeltir.
 *
 * Sorun:
 *  - Eski yapıda sadece tableNumber üzerinde unique index olabilir.
 *  - Yeni yapıda branchId + tableNumber birlikte unique olmalı.
 *  - Eski index varken farklı şubeler aynı masa numarasına QR oluşturamaz.
 *
 * Bu script:
 *  1) QRCode koleksiyonundaki index'leri listeler
 *  2) Sadece tableNumber üzerinde olan unique index'i (varsa) siler
 *  3) Mongoose şemadaki index'leri (branchId + tableNumber) sync eder
 *
 * Kullanım:
 *   cd backend
 *   node scripts/fixQRCodeIndexes.js
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

    const indexes = await QRCode.collection.indexes();
    console.log('📋 Mevcut QRCode indexleri:');
    indexes.forEach((idx) => console.log('  -', idx.name, idx.key, idx.unique ? '(unique)' : ''));

    // Sadece tableNumber üzerinde unique olan eski index'i bul
    const oldIndex = indexes.find(
      (idx) =>
        idx.key &&
        Object.keys(idx.key).length === 1 &&
        idx.key.tableNumber === 1
    );

    if (oldIndex) {
      console.log('\n⚠️ Eski tableNumber unique index bulundu, siliniyor:', oldIndex.name);
      try {
        await QRCode.collection.dropIndex(oldIndex.name);
        console.log('✅ Eski index silindi:', oldIndex.name);
      } catch (err) {
        console.error('❌ Index silinirken hata:', err);
      }
    } else {
      console.log('\nℹ️ Sadece tableNumber üzerinde bir unique index bulunamadı, geçiyorum.');
    }

    // Şemadaki index'leri senkronize et (branchId + tableNumber unique)
    console.log('\n🔁 Şema indexleri sync ediliyor (branchId + tableNumber)...');
    await QRCode.syncIndexes();
    console.log('✅ QRCode indexleri sync edildi.');

    await mongoose.disconnect();
    console.log('✅ İşlem tamam, bağlantı kapatıldı.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Genel hata:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

run();


