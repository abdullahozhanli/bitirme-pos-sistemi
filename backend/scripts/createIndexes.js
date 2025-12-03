/**
 * Index'leri manuel olarak oluşturma scripti
 * MongoDB'de index'ler otomatik oluşturulur ama bu script ile kontrol edebilirsiniz
 * 
 * Kullanım: node backend/scripts/createIndexes.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function createIndexes() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Model'leri import et (index'ler otomatik oluşturulur)
    require('../models/Order');
    require('../models/Product');
    require('../models/User');
    require('../models/OrderEvent');

    console.log('📊 Index\'ler kontrol ediliyor...\n');

    // Order index'leri
    const Order = mongoose.model('Order');
    const orderIndexes = await Order.collection.getIndexes();
    console.log('📦 Order Indexleri:');
    console.log(JSON.stringify(orderIndexes, null, 2));
    console.log('');

    // Product index'leri
    const Product = mongoose.model('Product');
    const productIndexes = await Product.collection.getIndexes();
    console.log('📦 Product Indexleri:');
    console.log(JSON.stringify(productIndexes, null, 2));
    console.log('');

    // User index'leri
    const User = mongoose.model('User');
    const userIndexes = await User.collection.getIndexes();
    console.log('📦 User Indexleri:');
    console.log(JSON.stringify(userIndexes, null, 2));
    console.log('');

    // OrderEvent index'leri
    const OrderEvent = mongoose.model('OrderEvent');
    const orderEventIndexes = await OrderEvent.collection.getIndexes();
    console.log('📦 OrderEvent Indexleri:');
    console.log(JSON.stringify(orderEventIndexes, null, 2));
    console.log('');

    console.log('✅ Index kontrolü tamamlandı');
    console.log('\n💡 Not: Indexler model tanimlarinda belirtildigi icin otomatik olusturulacak');
    console.log('   Ilk querylerde MongoDB indexleri olusturacak');

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

createIndexes();

