/**
 * Order verilerini analiz etme scripti
 * Hangi field'ların kullanıldığını ve migration gereksinimlerini gösterir
 * 
 * Kullanım: node backend/scripts/analyzeOrders.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function analyzeOrders() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const orders = await Order.find({}).lean();
    console.log(`📦 Toplam sipariş: ${orders.length}\n`);

    if (orders.length === 0) {
      console.log('⚠️  Veritabanında sipariş yok, migration gerekmez');
      await mongoose.disconnect();
      return;
    }

    // Analiz
    let needsMigration = false;
    const analysis = {
      total: orders.length,
      table: { count: 0, missing: 0, needsCopy: false },
      tableId: { count: 0, missing: 0 },
      waiter: { count: 0, missing: 0, needsCopy: false },
      waiterId: { count: 0, missing: 0 },
      items: { count: 0, missing: 0, needsCopy: false },
      orderItems: { count: 0, missing: 0 },
      total: { count: 0, missing: 0, needsCopy: false },
      totalPrice: { count: 0, missing: 0 },
    };

    orders.forEach(order => {
      // table vs tableId
      if (order.table) analysis.table.count++;
      else analysis.table.missing++;
      
      if (order.tableId) analysis.tableId.count++;
      else analysis.tableId.missing++;

      if (order.table && !order.tableId) {
        analysis.table.needsCopy = true;
        needsMigration = true;
      }

      // waiter vs waiterId
      if (order.waiter) analysis.waiter.count++;
      else analysis.waiter.missing++;
      
      if (order.waiterId) analysis.waiterId.count++;
      else analysis.waiterId.missing++;

      if (order.waiter && !order.waiterId) {
        analysis.waiter.needsCopy = true;
        needsMigration = true;
      }

      // items vs orderItems
      if (order.items && order.items.length > 0) analysis.items.count++;
      else analysis.items.missing++;
      
      if (order.orderItems && order.orderItems.length > 0) analysis.orderItems.count++;
      else analysis.orderItems.missing++;

      if (order.items && order.items.length > 0 && (!order.orderItems || order.orderItems.length === 0)) {
        analysis.items.needsCopy = true;
        needsMigration = true;
      }

      // total vs totalPrice
      if (order.total !== undefined && order.total !== null) analysis.total.count++;
      else analysis.total.missing++;
      
      if (order.totalPrice !== undefined && order.totalPrice !== null) analysis.totalPrice.count++;
      else analysis.totalPrice.missing++;

      if (order.total !== undefined && order.total !== null && (order.totalPrice === undefined || order.totalPrice === null)) {
        analysis.total.needsCopy = true;
        needsMigration = true;
      }
    });

    // Rapor
    console.log('📊 ANALİZ SONUÇLARI:\n');
    console.log('1. TABLE FIELD:');
    console.log(`   table: ${analysis.table.count} var, ${analysis.table.missing} yok`);
    console.log(`   tableId: ${analysis.tableId.count} var, ${analysis.tableId.missing} yok`);
    if (analysis.table.needsCopy) {
      console.log(`   ⚠️  MIGRATION GEREKLİ: ${analysis.table.count - analysis.tableId.count} siparişte table → tableId kopyalanmalı`);
    }

    console.log('\n2. WAITER FIELD:');
    console.log(`   waiter: ${analysis.waiter.count} var, ${analysis.waiter.missing} yok`);
    console.log(`   waiterId: ${analysis.waiterId.count} var, ${analysis.waiterId.missing} yok`);
    if (analysis.waiter.needsCopy) {
      console.log(`   ⚠️  MIGRATION GEREKLİ: ${analysis.waiter.count - analysis.waiterId.count} siparişte waiter → waiterId kopyalanmalı`);
    }

    console.log('\n3. ITEMS FIELD:');
    console.log(`   items: ${analysis.items.count} var, ${analysis.items.missing} yok`);
    console.log(`   orderItems: ${analysis.orderItems.count} var, ${analysis.orderItems.missing} yok`);
    if (analysis.items.needsCopy) {
      console.log(`   ⚠️  MIGRATION GEREKLİ: ${analysis.items.count - analysis.orderItems.count} siparişte items → orderItems dönüştürülmeli`);
      console.log(`   ⚠️  DİKKAT: items (MenuItem) → orderItems (Product) dönüşümü manuel kontrol gerektirebilir`);
    }

    console.log('\n4. TOTAL FIELD:');
    console.log(`   total: ${analysis.total.count} var, ${analysis.total.missing} yok`);
    console.log(`   totalPrice: ${analysis.totalPrice.count} var, ${analysis.totalPrice.missing} yok`);
    if (analysis.total.needsCopy) {
      console.log(`   ⚠️  MIGRATION GEREKLİ: ${analysis.total.count - analysis.totalPrice.count} siparişte total → totalPrice kopyalanmalı`);
    }

    console.log('\n' + '='.repeat(50));
    if (needsMigration) {
      console.log('⚠️  MIGRATION GEREKLİ!');
      console.log('   Sonraki adım: node backend/scripts/migrateOrders.js');
    } else {
      console.log('✅ Migration gerekmiyor, tüm field\'lar mevcut');
    }
    console.log('='.repeat(50));

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

analyzeOrders();

