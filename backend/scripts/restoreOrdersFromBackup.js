/**
 * Backup klasöründeki siparişleri MongoDB'ye geri yükle
 * 
 * Kullanım:
 *   node backend/scripts/restoreOrdersFromBackup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Order = require('../models/Order');

async function restoreOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');
    
    // Backup dosyasını oku
    const backupPath = path.join(__dirname, '../../backups/orders-backup-2025-12-03T02-59-46-072Z.json');
    
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Backup dosyası bulunamadı:', backupPath);
      process.exit(1);
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log(`📦 Backup dosyasından ${backupData.length} sipariş okundu\n`);
    
    // Mevcut siparişleri kontrol et
    const existingCount = await Order.countDocuments();
    console.log(`📊 Mevcut veritabanında ${existingCount} sipariş var`);
    
    if (existingCount > 0) {
      console.log('\n⚠️  DİKKAT: Veritabanında zaten siparişler var!');
      console.log('   Yeni siparişler eklenirken mevcutler silinmeyecek.');
      console.log('   Sadece yeni olanlar (ID eşleşmeyenler) eklenecek.\n');
    }
    
    // Siparişleri import et
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    console.log('🔄 Siparişler import ediliyor...\n');
    
    for (let i = 0; i < backupData.length; i++) {
      const orderData = backupData[i];
      
      try {
        // _id zaten varsa skip et
        const exists = await Order.findById(orderData._id);
        if (exists) {
          skipped++;
          if ((i + 1) % 50 === 0) {
            process.stdout.write(`\r   İşleniyor: ${i + 1}/${backupData.length} (✅ ${imported} eklendi, ⏭️  ${skipped} atlandı, ❌ ${errors} hata)`);
          }
          continue;
        }
        
        // createdAt ve updatedAt alanlarını düzelt
        if (orderData.createdAt) {
          orderData.createdAt = new Date(orderData.createdAt);
        }
        if (orderData.updatedAt) {
          orderData.updatedAt = new Date(orderData.updatedAt);
        }
        
        // Yeni sipariş oluştur
        const order = new Order(orderData);
        await order.save();
        imported++;
        
        if ((i + 1) % 50 === 0 || (i + 1) === backupData.length) {
          process.stdout.write(`\r   İşleniyor: ${i + 1}/${backupData.length} (✅ ${imported} eklendi, ⏭️  ${skipped} atlandı, ❌ ${errors} hata)`);
        }
      } catch (error) {
        errors++;
        console.error(`\n❌ Sipariş ${orderData._id} import edilirken hata:`, error.message);
      }
    }
    
    console.log('\n\n=== Özet ===');
    console.log(`✅ İçe aktarılan yeni siparişler: ${imported}`);
    console.log(`⏭️  Atlanan siparişler (zaten mevcut): ${skipped}`);
    console.log(`❌ Hata oluşan siparişler: ${errors}`);
    console.log(`📊 Toplam backup içeriği: ${backupData.length}`);
    
    // Son durumu göster
    const finalCount = await Order.countDocuments();
    console.log(`\n📊 Veritabanındaki toplam sipariş sayısı: ${finalCount}`);
    
    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Hata:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

restoreOrders();

