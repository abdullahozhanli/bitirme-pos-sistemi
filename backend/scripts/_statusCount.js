require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Branch = require('../models/Branch');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const names = ['Brew Mood', 'Yeşil Mola Cafe'];

  for (const name of names) {
    const branch = await Branch.findOne({ name }).lean();
    if (!branch) {
      console.log(name, '— şube bulunamadı');
      continue;
    }

    const total = await Product.countDocuments({ branchId: branch._id });
    const published = await Product.countDocuments({
      branchId: branch._id,
      nutritionStatus: 'approved',
      'nutrition.isNutritionVisibleToCustomer': true,
      'nutrition.calories': { $gt: 0 },
    });
    const withDesc = await Product.countDocuments({
      branchId: branch._id,
      description: { $exists: true, $nin: [null, ''] },
    });
    const full = await Product.countDocuments({
      branchId: branch._id,
      nutritionStatus: 'approved',
      'nutrition.isNutritionVisibleToCustomer': true,
      'nutrition.calories': { $gt: 0 },
      description: { $exists: true, $nin: [null, ''] },
    });

    console.log(`\n${name}`);
    console.log(`  Toplam ürün: ${total}`);
    console.log(`  Müşteriye kalori yayında: ${published}`);
    console.log(`  Açıklaması olan: ${withDesc}`);
    console.log(`  Kalori + açıklama (tam): ${full}`);
    console.log(`  Eksik: ${total - full}`);
  }

  const allPub = await Product.countDocuments({
    nutritionStatus: 'approved',
    'nutrition.isNutritionVisibleToCustomer': true,
    'nutrition.calories': { $gt: 0 },
    description: { $exists: true, $nin: [null, ''] },
    branchId: {
      $in: (
        await Branch.find({ name: { $in: names } }).select('_id').lean()
      ).map((b) => b._id),
    },
  });
  console.log(`\nİki şube toplam (tam yayın): ${allPub} / 46`);

  const fullList = await Product.find({
    branchId: { $in: (await Branch.find({ name: { $in: names } }).select('_id').lean()).map((b) => b._id) },
    nutritionStatus: 'approved',
    'nutrition.isNutritionVisibleToCustomer': true,
    'nutrition.calories': { $gt: 0 },
    description: { $exists: true, $nin: [null, ''] },
  })
    .select('name nutrition.calories branchId')
    .populate('branchId', 'name')
    .lean();

  if (fullList.length) {
    console.log('\nTam yayında olanlar:');
    fullList.forEach((p) => {
      console.log(`  - ${p.branchId?.name} | ${p.name} | ${p.nutrition?.calories} kcal`);
    });
  }

  await mongoose.disconnect();
})();
