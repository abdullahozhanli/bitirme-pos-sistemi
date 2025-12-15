/**
 * Tüm şubeleri B-910 altında birleştir
 *
 * Kullanım:
 *   cd backend
 *   node scripts/mergeBranchesToB910.js
 *
 * Ne yapar?
 *   - name === 'B-910' olan şubeyi bulur (hedef şube)
 *   - Diğer tüm şubelerin branchId referanslarını (User, Product, Category, Table,
 *     Order, QRCode, StockMovement, DailyAggregate) B-910'a taşır
 *   - Sonra diğer şube kayıtlarını siler
 *
 * NOT: Geri dönüşü ZOR. Çalıştırmadan önce MongoDB yedeği alman iyi olur.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Branch = require('../models/Branch');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Table = require('../models/Table');
const Order = require('../models/Order');
const QRCode = require('../models/QRCode');
const StockMovement = require('../models/StockMovement');
const DailyAggregate = require('../models/DailyAggregate');

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGO_URI .env dosyasında bulunamadı');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ MongoDB bağlantısı başarılı');

    // 1) Hedef şubeyi bul (B-910)
    const targetBranch = await Branch.findOne({ name: 'B-910' }).lean();
    if (!targetBranch) {
      console.error('❌ "B-910" adlı şube bulunamadı. Önce bu şubeyi oluştur.');
      process.exit(1);
    }

    const targetId = targetBranch._id;
    console.log('🎯 Hedef şube:', targetBranch.name, String(targetId));

    // 2) Diğer şubeleri bul
    const otherBranches = await Branch.find({ _id: { $ne: targetId } }).lean();
    if (otherBranches.length === 0) {
      console.log('ℹ️  B-910 dışında şube yok, yapılacak bir şey yok.');
      process.exit(0);
    }

    const otherIds = otherBranches.map((b) => b._id);
    console.log('📋 Taşınacak şubeler:');
    otherBranches.forEach((b) => {
      console.log('  -', b.name, String(b._id));
    });

    // 3) Yardımcı fonksiyon: updateMany + log
    async function moveBranchRefs(Model, modelName) {
      const res = await Model.updateMany(
        { branchId: { $in: otherIds } },
        { $set: { branchId: targetId } }
      );
      if (res.modifiedCount) {
        console.log(`✅ ${modelName}: ${res.modifiedCount} kayıt B-910'a taşındı`);
      } else {
        console.log(`ℹ️  ${modelName}: Taşınacak kayıt bulunamadı`);
      }
    }

    // 4) Referansları taşı
    console.log('\n🔁 branchId referansları B-910\'a taşınıyor...\n');

    // Süper admin hariç kullanıcılar
    const userRes = await User.updateMany(
      { branchId: { $in: otherIds }, role: { $ne: 'superadmin' } },
      { $set: { branchId: targetId } }
    );
    console.log(`✅ User: ${userRes.modifiedCount} kullanıcı B-910'a taşındı (superadmin hariç)`);

    await moveBranchRefs(Product, 'Product');
    await moveBranchRefs(Category, 'Category');
    await moveBranchRefs(Table, 'Table');
    await moveBranchRefs(Order, 'Order');
    await moveBranchRefs(QRCode, 'QRCode');
    await moveBranchRefs(StockMovement, 'StockMovement');
    await moveBranchRefs(DailyAggregate, 'DailyAggregate');

    // 5) Eski şubeleri sil
    console.log('\n🧹 Eski şubeler siliniyor...');
    const deleteRes = await Branch.deleteMany({ _id: { $in: otherIds } });
    console.log(`✅ ${deleteRes.deletedCount} adet şube silindi (B-910 harici hepsi).`);

    await mongoose.disconnect();
    console.log('\n🎉 İşlem tamamlandı. Artık sadece B-910 şubesi kaldı ve tüm veriler ona bağlı.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err);
    process.exit(1);
  }
}

run();


