/**
 * Category koleksiyonundaki eski unique index'i düzeltir.
 *
 * Sorun:
 *  - Eski yapıda sadece name üzerinde unique index olabilir.
 *  - Yeni yapıda branchId + name birlikte unique olmalı.
 *  - Eski index varken farklı şubeler aynı kategori adını kullanamaz.
 *
 * Bu script:
 *  1) Category koleksiyonundaki index'leri listeler
 *  2) Sadece name üzerinde olan unique index'i (varsa) siler
 *  3) Mongoose şemadaki index'leri (branchId + name) sync eder
 *
 * Kullanım:
 *   cd backend
 *   node scripts/fixCategoryIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

async function run() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI .env dosyasında bulunamadı');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    const indexes = await Category.collection.indexes();
    console.log('📋 Mevcut Category indexleri:');
    indexes.forEach((idx) =>
      console.log('  -', idx.name, idx.key, idx.unique ? '(unique)' : '')
    );

    // Sadece name üzerinde unique olan eski index'i bul
    const oldIndex = indexes.find(
      (idx) =>
        idx.key &&
        Object.keys(idx.key).length === 1 &&
        idx.key.name === 1
    );

    if (oldIndex) {
      console.log('\n⚠️ Eski name unique index bulundu, siliniyor:', oldIndex.name);
      try {
        await Category.collection.dropIndex(oldIndex.name);
        console.log('✅ Eski index silindi:', oldIndex.name);
      } catch (err) {
        console.error('❌ Index silinirken hata:', err);
      }
    } else {
      console.log('\nℹ️ Sadece name üzerinde bir unique index bulunamadı, geçiyorum.');
    }

    // Şemadaki index'leri senkronize et (branchId + name)
    console.log('\n🔁 Şema indexleri sync ediliyor (branchId + name)...');
    await Category.syncIndexes();
    console.log('✅ Category indexleri sync edildi.');

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


