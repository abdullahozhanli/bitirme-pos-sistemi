/**
 * Order verilerini migration scripti
 * Eski field'ları yeni field'lara kopyalar (VERİ KAYBI OLMAZ)
 * 
 * ÖNEMLİ: Önce backup alın! (node backend/scripts/backupOrders.js)
 * 
 * Kullanım: node backend/scripts/migrateOrders.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function migrateOrders() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const orders = await Order.find({});
    console.log(`📦 ${orders.length} adet sipariş bulundu\n`);

    if (orders.length === 0) {
      console.log('⚠️  Veritabanında sipariş yok, migration gerekmez');
      await mongoose.disconnect();
      return;
    }

    let migrated = 0;
    const stats = {
      table: 0,
      waiter: 0,
      items: 0,
      total: 0,
    };

    console.log('🔄 Migration başlıyor...\n');

    for (const order of orders) {
      let updated = false;

      // 1. table → tableId
      if (order.table && !order.tableId) {
        order.tableId = order.table;
        stats.table++;
        updated = true;
      }

      // 2. waiter → waiterId
      if (order.waiter && !order.waiterId) {
        order.waiterId = order.waiter;
        stats.waiter++;
        updated = true;
      }

      // 3. total → totalPrice
      if (order.total !== undefined && order.total !== null && (order.totalPrice === undefined || order.totalPrice === null)) {
        order.totalPrice = order.total;
        stats.total++;
        updated = true;
      }

      // 4. items → orderItems (DİKKAT: Bu dönüşüm daha karmaşık)
      if (order.items && order.items.length > 0 && (!order.orderItems || order.orderItems.length === 0)) {
        // items array'ini orderItems formatına dönüştür
        order.orderItems = order.items.map(item => ({
          product: item.menuItem || null, // menuItem → product (aynı referans olabilir)
          name: item.name,
          qty: item.qty,
          price: item.price,
          note: item.note || '',
          station: 'hot', // Varsayılan station
          status: 'QUEUED', // Varsayılan status
        }));
        stats.items++;
        updated = true;
      }

      if (updated) {
        await order.save();
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ ${migrated} sipariş migrate edildi...`);
        }
      }
    }

    console.log(`\n✅ Migration tamamlandı!`);
    console.log(`   Toplam sipariş: ${orders.length}`);
    console.log(`   Migrate edilen: ${migrated}`);
    console.log(`\n📊 Detaylar:`);
    console.log(`   table → tableId: ${stats.table}`);
    console.log(`   waiter → waiterId: ${stats.waiter}`);
    console.log(`   items → orderItems: ${stats.items}`);
    console.log(`   total → totalPrice: ${stats.total}`);

    console.log(`\n✅ Sonraki adım: Test et (node backend/scripts/testMigration.js)`);

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

migrateOrders();

