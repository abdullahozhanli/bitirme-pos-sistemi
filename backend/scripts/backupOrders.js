/**
 * Order verilerini yedekleme scripti
 * Tüm Order'ları JSON dosyasına export eder
 * 
 * Kullanım: node backend/scripts/backupOrders.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const Order = require('../models/Order');

async function backupOrders() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Tüm Order'ları çek
    const orders = await Order.find({}).lean();
    console.log(`📦 ${orders.length} adet sipariş bulundu`);

    // Yedekleme klasörü oluştur
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Timestamp ile dosya adı
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `orders-backup-${timestamp}.json`);

    // JSON'a yaz
    fs.writeFileSync(backupFile, JSON.stringify(orders, null, 2), 'utf8');

    console.log(`\n✅ Yedekleme tamamlandı!`);
    console.log(`   Dosya: ${backupFile}`);
    console.log(`   Toplam sipariş: ${orders.length}`);
    
    // İstatistikler
    const stats = {
      total: orders.length,
      withTable: orders.filter(o => o.table).length,
      withTableId: orders.filter(o => o.tableId).length,
      withWaiter: orders.filter(o => o.waiter).length,
      withWaiterId: orders.filter(o => o.waiterId).length,
      withItems: orders.filter(o => o.items && o.items.length > 0).length,
      withOrderItems: orders.filter(o => o.orderItems && o.orderItems.length > 0).length,
      withTotal: orders.filter(o => o.total !== undefined && o.total !== null).length,
      withTotalPrice: orders.filter(o => o.totalPrice !== undefined && o.totalPrice !== null).length,
    };

    console.log('\n📊 İstatistikler:');
    console.log(`   table field: ${stats.withTable}`);
    console.log(`   tableId field: ${stats.withTableId}`);
    console.log(`   waiter field: ${stats.withWaiter}`);
    console.log(`   waiterId field: ${stats.withWaiterId}`);
    console.log(`   items field: ${stats.withItems}`);
    console.log(`   orderItems field: ${stats.withOrderItems}`);
    console.log(`   total field: ${stats.withTotal}`);
    console.log(`   totalPrice field: ${stats.withTotalPrice}`);

    // İstatistikleri de kaydet
    const statsFile = path.join(backupDir, `orders-stats-${timestamp}.json`);
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf8');
    console.log(`\n   İstatistikler: ${statsFile}`);

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

backupOrders();

