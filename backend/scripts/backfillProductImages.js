const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
require('dotenv').config();

// Kategori bazlı fallback görseller
const FALLBACK_IMAGES = {
  'Ana Yemek': '/img/steak.jpg',
  'İçecekler': '/img/drink.jpg',
  'Tatlılar': '/img/dessert.jpg',
  'Salatalar': '/img/salad.jpg',
  'Çerez': '/img/snack.jpg',
  'Ara Sıcak': '/img/appetizer.jpg',
  'Kahveler': '/img/coffee.jpg',
};

const PLACEHOLDER_IMAGE = '/img/placeholder.webp';

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB bağlantısı başarılı');

    // Tüm ürünleri çek
    const products = await Product.find({}).populate('category', 'name');
    console.log(`Toplam ${products.length} ürün bulundu`);

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      // Eğer imageUrl varsa atla
      if (product.imageUrl) {
        skipped++;
        continue;
      }

      // Kategoriye göre fallback görsel ata
      const categoryName = product.category?.name || '';
      const fallbackImage = FALLBACK_IMAGES[categoryName] || PLACEHOLDER_IMAGE;

      product.imageUrl = fallbackImage;
      await product.save();
      updated++;

      console.log(`✓ ${product.name} → ${fallbackImage}`);
    }

    console.log('\n=== Özet ===');
    console.log(`Güncellenen: ${updated}`);
    console.log(`Atlanan (zaten imageUrl var): ${skipped}`);
    console.log(`Toplam: ${products.length}`);

    await mongoose.disconnect();
    console.log('\nİşlem tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
})();

