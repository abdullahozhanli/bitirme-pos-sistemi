/**
 * Belirli bir siparişi kontrol etme scripti
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function checkOrder(orderId) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const order = await Order.findById(orderId).lean();
    
    if (!order) {
      console.log('❌ Sipariş bulunamadı');
      process.exit(1);
    }

    console.log('📋 Sipariş Detayları:');
    console.log(JSON.stringify(order, null, 2));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

const orderId = process.argv[2];
if (!orderId) {
  console.log('Kullanım: node backend/scripts/checkOrder.js <orderId>');
  process.exit(1);
}

checkOrder(orderId);

