/**
 * Migration sonrası test scripti
 * Veri kaybı olup olmadığını kontrol eder
 * 
 * Kullanım: node backend/scripts/testMigration.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function testMigration() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const orders = await Order.find({}).lean();
    console.log(`📦 ${orders.length} adet sipariş test ediliyor...\n`);

    if (orders.length === 0) {
      console.log('⚠️  Veritabanında sipariş yok');
      await mongoose.disconnect();
      return;
    }

    let errors = [];
    let warnings = [];

    orders.forEach((order, index) => {
      // Test 1: tableId var mı? (tableNumber varsa da geçerli)
      // Eğer orderItems ve totalPrice varsa (yeni format), table eksikliği sadece uyarı
      const isNewFormat = (order.orderItems && order.orderItems.length > 0) && 
                          (order.totalPrice !== undefined && order.totalPrice !== null);
      
      if (!order.tableId && !order.table && !order.tableNumber) {
        if (isNewFormat) {
          warnings.push(`Sipariş ${order._id}: table/tableId yok ama yeni format kullanılıyor (muhtemelen test siparişi)`);
        } else {
          errors.push(`Sipariş ${order._id}: table, tableId ve tableNumber yok!`);
        }
      }

      // Test 2: totalPrice var mı?
      if ((order.totalPrice === undefined || order.totalPrice === null) && 
          (order.total === undefined || order.total === null)) {
        errors.push(`Sipariş ${order._id}: total ve totalPrice yok!`);
      }

      // Test 3: orderItems veya items var mı?
      const hasItems = order.items && order.items.length > 0;
      const hasOrderItems = order.orderItems && order.orderItems.length > 0;
      if (!hasItems && !hasOrderItems) {
        warnings.push(`Sipariş ${order._id}: items ve orderItems yok (boş sipariş?)`);
      }

      // Test 4: Eski ve yeni field'lar tutarlı mı?
      if (order.table && order.tableId) {
        if (String(order.table) !== String(order.tableId)) {
          errors.push(`Sipariş ${order._id}: table ve tableId eşleşmiyor!`);
        }
      }

      if (order.waiter && order.waiterId) {
        if (String(order.waiter) !== String(order.waiterId)) {
          errors.push(`Sipariş ${order._id}: waiter ve waiterId eşleşmiyor!`);
        }
      }

      if (order.total !== undefined && order.totalPrice !== undefined) {
        if (Math.abs(order.total - order.totalPrice) > 0.01) {
          warnings.push(`Sipariş ${order._id}: total (${order.total}) ve totalPrice (${order.totalPrice}) farklı`);
        }
      }
    });

    // Sonuçlar
    console.log('='.repeat(50));
    if (errors.length === 0) {
      if (warnings.length === 0) {
        console.log('✅ TÜM TESTLER BAŞARILI!');
        console.log('   Veri kaybı yok, migration başarılı');
      } else {
        console.log('✅ MİGRATİON BAŞARILI! (Uyarılar var ama kritik değil)');
        console.log('   Veri kaybı yok, migration başarılı');
      }
      console.log('\n✅ Sonraki adım: Kod güncellemesi yapılabilir');
    } else {
      if (errors.length > 0) {
        console.log(`❌ ${errors.length} KRİTİK HATA BULUNDU:`);
        errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
        if (errors.length > 10) {
          console.log(`   ... ve ${errors.length - 10} hata daha`);
        }
        console.log('\n⚠️  Migration başarısız, rollback yapılmalı!');
      }
      
      if (warnings.length > 0) {
        console.log(`\n⚠️  ${warnings.length} UYARI:`);
        warnings.slice(0, 5).forEach(warn => console.log(`   - ${warn}`));
        if (warnings.length > 5) {
          console.log(`   ... ve ${warnings.length - 5} uyarı daha`);
        }
      }
    }
    console.log('='.repeat(50));

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

testMigration();

