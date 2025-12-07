/**
 * Migration Script: Mevcut verileri Default Branch'e atama
 * 
 * Kullanım: node backend/scripts/migrateToBranches.js
 * 
 * Bu script:
 * 1. "Default Branch" adında bir branch oluşturur (yoksa)
 * 2. Tüm mevcut verileri bu branch'e atar
 * 3. Mevcut admin kullanıcıları superadmin yapar (opsiyonel)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Table = require('../models/Table');
const QRCode = require('../models/QRCode');
const MenuItem = require('../models/MenuItem');
const Payment = require('../models/Payment');
const StockMovement = require('../models/StockMovement');
const Order = require('../models/Order');
const DailyAggregate = require('../models/DailyAggregate');

const DEFAULT_BRANCH_NAME = 'Default Branch';
const MAKE_ADMINS_SUPERADMIN = true; // true ise mevcut admin'leri superadmin yapar

async function migrate() {
  try {
    console.log('🔄 Migration başlatılıyor...');
    
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // 1. Default Branch oluştur veya bul
    let defaultBranch = await Branch.findOne({ name: DEFAULT_BRANCH_NAME });
    if (!defaultBranch) {
      defaultBranch = new Branch({
        name: DEFAULT_BRANCH_NAME,
        address: 'Migrasyon ile oluşturuldu',
        isActive: true,
      });
      await defaultBranch.save();
      console.log('✅ Default Branch oluşturuldu:', defaultBranch._id);
    } else {
      console.log('ℹ️  Default Branch zaten mevcut:', defaultBranch._id);
    }

    const branchId = defaultBranch._id;

    // 2. Tüm modellere branchId ekle
    console.log('\n📦 Modellere branchId ekleniyor...');

    // Products
    const productsUpdated = await Product.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${productsUpdated.modifiedCount} ürün güncellendi`);

    // Categories
    const categoriesUpdated = await Category.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${categoriesUpdated.modifiedCount} kategori güncellendi`);

    // Tables
    const tablesUpdated = await Table.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${tablesUpdated.modifiedCount} masa güncellendi`);

    // QR Codes
    const qrCodesUpdated = await QRCode.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${qrCodesUpdated.modifiedCount} QR kod güncellendi`);

    // Menu Items
    const menuItemsUpdated = await MenuItem.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${menuItemsUpdated.modifiedCount} menü öğesi güncellendi`);

    // Payments
    const paymentsUpdated = await Payment.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${paymentsUpdated.modifiedCount} ödeme güncellendi`);

    // Stock Movements
    const stockMovementsUpdated = await StockMovement.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${stockMovementsUpdated.modifiedCount} stok hareketi güncellendi`);

    // Orders (zaten branchId var ama kontrol edelim)
    const ordersUpdated = await Order.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${ordersUpdated.modifiedCount} sipariş güncellendi`);

    // Daily Aggregates
    const dailyAggregatesUpdated = await DailyAggregate.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId } }
    );
    console.log(`✅ ${dailyAggregatesUpdated.modifiedCount} günlük özet güncellendi`);

    // 3. Kullanıcılara branchId ekle (superadmin değilse)
    console.log('\n👥 Kullanıcılar güncelleniyor...');
    const usersUpdated = await User.updateMany(
      { 
        branchId: { $exists: false },
        role: { $ne: 'superadmin' }
      },
      { $set: { branchId } }
    );
    console.log(`✅ ${usersUpdated.modifiedCount} kullanıcı güncellendi`);

    // 4. Admin kullanıcıları superadmin yap (opsiyonel)
    if (MAKE_ADMINS_SUPERADMIN) {
      console.log('\n👑 Admin kullanıcıları superadmin yapılıyor...');
      const adminsUpdated = await User.updateMany(
        { role: 'admin' },
        { 
          $set: { 
            role: 'superadmin',
            branchId: null // Süper admin'ler branch'e bağlı değil
          } 
        }
      );
      console.log(`✅ ${adminsUpdated.modifiedCount} admin kullanıcı superadmin yapıldı`);
    }

    console.log('\n✅ Migration tamamlandı!');
    console.log(`📊 Default Branch ID: ${branchId}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
migrate();

