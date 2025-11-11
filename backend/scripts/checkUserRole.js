require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUserRole() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const email = process.argv[2];
    if (!email) {
      console.log('Kullanım: node scripts/checkUserRole.js <email>');
      console.log('Örnek: node scripts/checkUserRole.js admin@example.com');
      process.exit(1);
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log(`❌ Kullanıcı bulunamadı: ${email}`);
      process.exit(1);
    }

    console.log(`📋 Kullanıcı Bilgileri:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   İsim: ${user.name || 'Yok'}`);
    console.log(`   Rol: ${user.role || 'Yok'}`);
    console.log(`   Aktif: ${user.isActive ? 'Evet' : 'Hayır'}`);
    console.log(`   ID: ${user._id}`);

    if (user.role !== 'admin') {
      console.log(`\n⚠️  Kullanıcının rolü 'admin' değil!`);
      console.log(`\nRolü 'admin' yapmak için:`);
      console.log(`db.users.updateOne(`);
      console.log(`  { email: "${email}" },`);
      console.log(`  { $set: { role: "admin" } }`);
      console.log(`)`);
      console.log(`\nVeya bu script'i çalıştırın:`);
      console.log(`node scripts/setUserRole.js ${email} admin`);
    } else {
      console.log(`\n✅ Kullanıcının rolü 'admin'`);
    }

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

checkUserRole();

