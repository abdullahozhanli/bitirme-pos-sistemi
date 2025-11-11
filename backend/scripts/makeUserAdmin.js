/**
 * Belirli bir kullanıcıyı admin yap
 * 
 * Kullanım:
 *   node backend/scripts/makeUserAdmin.js <email>
 * 
 * Örnek:
 *   node backend/scripts/makeUserAdmin.js admin@example.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function makeUserAdmin() {
  try {
    const email = process.argv[2];
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Email verilmemişse tüm kullanıcıları listele
    if (!email) {
      console.log('\n📋 Mevcut kullanıcılar:');
      const users = await User.find({}).select('email role name active');
      if (users.length === 0) {
        console.log('   Hiç kullanıcı bulunamadı');
      } else {
        users.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.email} - Rol: ${u.role} - İsim: ${u.name || 'Yok'}`);
        });
      }
      console.log('\n💡 Kullanım: node backend/scripts/makeUserAdmin.js <email>');
      console.log('   Örnek: node backend/scripts/makeUserAdmin.js admin@example.com');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ ${email} adresine sahip kullanıcı bulunamadı`);
      console.log('\n📋 Mevcut kullanıcılar:');
      const users = await User.find({}).select('email role');
      users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} - Rol: ${u.role}`);
      });
      await mongoose.disconnect();
      process.exit(1);
    }

    // Zaten admin ise
    if (user.role === 'admin') {
      console.log(`ℹ️  ${email} zaten admin rolüne sahip`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Admin yap
    user.role = 'admin';
    await user.save();
    
    console.log(`✅ ${email} kullanıcısı admin rolüne yükseltildi`);
    console.log(`   Eski rol: ${user._doc?.role || 'waiter'}`);
    console.log(`   Yeni rol: admin`);

    await mongoose.disconnect();
    console.log('✅ İşlem tamamlandı');
    console.log('\n📝 Şimdi yapmanız gerekenler:');
    console.log('   1. Tarayıcıda çıkış yapın');
    console.log('   2. Tekrar giriş yapın');
    console.log('   3. Yeni token ile admin yetkilerine sahip olacaksınız');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

makeUserAdmin();

