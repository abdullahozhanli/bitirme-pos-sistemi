const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // admin@pos.com kullanıcısını bul
    const user = await User.findOne({ email: 'admin@pos.com' });
    
    if (!user) {
      console.log('❌ Kullanıcı bulunamadı');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('📋 Kullanıcı Bilgileri:');
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   passwordHash var mı: ${!!user.passwordHash}`);
    console.log(`   passwordHash tipi: ${typeof user.passwordHash}`);
    console.log(`   passwordHash değeri: ${user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'YOK'}`);
    console.log(`   password var mı: ${!!user.password}`);
    console.log(`   password tipi: ${typeof user.password}`);
    console.log(`   password değeri: ${user.password ? user.password.substring(0, 20) + '...' : 'YOK'}`);
    console.log(`   Tüm alanlar:`, Object.keys(user.toObject()));

    // Eğer passwordHash yoksa ama password varsa, passwordHash'e kopyala
    if (!user.passwordHash && user.password) {
      console.log('\n🔧 passwordHash yok, password\'dan kopyalanıyor...');
      user.passwordHash = user.password;
      await user.save();
      console.log('✅ passwordHash güncellendi');
    } else if (!user.passwordHash && !user.password) {
      console.log('\n❌ Hem passwordHash hem de password yok!');
    } else {
      console.log('\n✅ passwordHash mevcut');
    }

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
})();
