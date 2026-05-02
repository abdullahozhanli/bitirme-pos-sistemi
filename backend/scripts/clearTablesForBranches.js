/**
 * Belirli şubelere ait tüm masaları temizler.
 *
 * Kullanım:
 *   cd backend
 *   node scripts/clearTablesForBranches.js
 *
 * Bu script:
 *   - Adı 'B-910' veya 'B-204' olan şubeleri bulur
 *   - Sadece bu şubelere ait masaları (Table) siler
 *
 * NOT:
 *   - QRCode kayıtlarını daha önce clearQRCodes.js ile sildik
 *   - Bu script siparişleri SİLMEZ, sadece masa kayıtlarını siler
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Table = require('../models/Table');

async function run() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI .env dosyasında bulunamadı');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Hedef şube adları (gerekirse buraya yeni isimler ekleyebilirsin)
    const targetNames = ['B-910', 'B-204'];

    const branches = await Branch.find({ name: { $in: targetNames } }).lean();
    if (branches.length === 0) {
      console.log('ℹ️ Belirtilen isimlerle eşleşen şube bulunamadı:', targetNames);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('🎯 Temizlenecek şubeler:');
    const branchIds = branches.map((b) => {
      console.log(`  - ${b.name} (${b._id})`);
      return b._id;
    });

    const result = await Table.deleteMany({ branchId: { $in: branchIds } });
    console.log(`🧹 ${result.deletedCount} adet masa silindi (B-910 ve B-204 için).`);

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








