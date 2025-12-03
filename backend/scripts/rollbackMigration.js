/**
 * Migration rollback scripti
 * Yedekten geri yükleme (SADECE ACİL DURUMLARDA KULLANIN!)
 * 
 * Kullanım: node backend/scripts/rollbackMigration.js <backup-file-path>
 * 
 * ÖRNEK: node backend/scripts/rollbackMigration.js backups/orders-backup-2024-01-01T12-00-00-000Z.json
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const Order = require('../models/Order');

async function rollbackMigration(backupFile) {
  try {
    if (!backupFile) {
      console.error('❌ Yedek dosya yolu gerekli!');
      console.log('\nKullanım: node backend/scripts/rollbackMigration.js <backup-file-path>');
      console.log('Örnek: node backend/scripts/rollbackMigration.js backups/orders-backup-2024-01-01T12-00-00-000Z.json');
      process.exit(1);
    }

    const fullPath = path.isAbsolute(backupFile) 
      ? backupFile 
      : path.join(__dirname, '../../../', backupFile);

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Yedek dosya bulunamadı: ${fullPath}`);
      process.exit(1);
    }

    console.log('⚠️  UYARI: Bu işlem mevcut tüm Order verilerini silecek!');
    console.log(`   Yedek dosya: ${fullPath}`);
    console.log('\nDevam etmek için 10 saniye bekleniyor... (Ctrl+C ile iptal edebilirsiniz)');
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Yedek dosyasını oku
    console.log('📖 Yedek dosyası okunuyor...');
    const backupData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`✅ ${backupData.length} adet sipariş yedekten okundu\n`);

    // Mevcut tüm Order'ları sil
    console.log('🗑️  Mevcut Order'lar siliniyor...');
    await Order.deleteMany({});
    console.log('✅ Mevcut Order'lar silindi\n');

    // Yedekten geri yükle
    console.log('🔄 Yedekten geri yükleniyor...');
    await Order.insertMany(backupData);
    console.log(`✅ ${backupData.length} adet sipariş geri yüklendi\n`);

    console.log('✅ Rollback tamamlandı!');
    console.log('   Veritabanı yedek durumuna geri döndürüldü');

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

const backupFile = process.argv[2];
rollbackMigration(backupFile);

