/**
 * Login test script
 * 
 * Kullanım:
 *   node backend/scripts/testLogin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const email = 'garson@example.com';
    const password = 'garson123';

    // Kullanıcıyı bul
    console.log('🔍 Kullanıcı aranıyor...');
    let user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ Kullanıcı bulunamadı:', email);
      await mongoose.disconnect();
      return;
    }

    console.log('✅ Kullanıcı bulundu:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   isActive: ${user.isActive}`);
    console.log(`   active: ${user.active}`);
    console.log(`   passwordHash var mı: ${!!user.passwordHash}`);
    console.log(`   passwordHash tipi: ${typeof user.passwordHash}`);
    console.log(`   passwordHash uzunluğu: ${user.passwordHash?.length || 0}`);
    if (user.passwordHash) {
      console.log(`   passwordHash ilk 30 karakter: ${user.passwordHash.substring(0, 30)}...`);
    }

    // .select('+passwordHash') ile tekrar dene
    console.log('\n🔍 .select("+passwordHash") ile tekrar aranıyor...');
    user = await User.findOne({ email }).select('+passwordHash');
    
    console.log(`   passwordHash var mı: ${!!user.passwordHash}`);
    console.log(`   passwordHash tipi: ${typeof user.passwordHash}`);
    console.log(`   passwordHash uzunluğu: ${user.passwordHash?.length || 0}`);

    // Şifre kontrolü
    if (user.passwordHash) {
      console.log('\n🔐 Şifre kontrol ediliyor...');
      console.log(`   Password: ${password}`);
      console.log(`   passwordHash: ${user.passwordHash.substring(0, 30)}...`);
      
      try {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log(`   ✅ Şifre eşleşiyor: ${isMatch}`);
      } catch (error) {
        console.error('   ❌ bcrypt.compare() hatası:', error.message);
        console.error('   Hata detayı:', error);
      }
    } else {
      console.log('\n❌ passwordHash bulunamadı!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Test tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

testLogin();

