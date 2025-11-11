require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function setUserRole() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const email = process.argv[2];
    const role = process.argv[3];

    if (!email || !role) {
      console.log('Kullanım: node scripts/setUserRole.js <email> <role>');
      console.log('Örnek: node scripts/setUserRole.js admin@example.com admin');
      console.log('\nGeçerli roller: admin, yetkili, garson, mutfak, kasa, musteri');
      process.exit(1);
    }

    const allowedRoles = ['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];
    if (!allowedRoles.includes(role)) {
      console.log(`❌ Geçersiz rol: ${role}`);
      console.log(`Geçerli roller: ${allowedRoles.join(', ')}`);
      process.exit(1);
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ Kullanıcı bulunamadı: ${email}`);
      process.exit(1);
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    console.log(`✅ Kullanıcı rolü güncellendi:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Eski Rol: ${oldRole || 'Yok'}`);
    console.log(`   Yeni Rol: ${user.role}`);

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

setUserRole();

