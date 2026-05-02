/**
 * Kasa kullanıcısı oluştur
 * 
 * Kullanım:
 *   node backend/scripts/createKasaUser.js
 *   node backend/scripts/createKasaUser.js kasa@example.com kasa123
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function createKasaUser() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI bulunamadı! .env dosyasını kontrol edin.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const email = process.argv[2] || 'kasa@example.com';
    const password = process.argv[3] || 'kasa123';
    const name = 'Kasa Kullanıcı';

    // Kullanıcı var mı kontrol et
    let user = await User.findOne({ email });
    
    if (user) {
      console.log(`⚠️  Kullanıcı zaten var: ${email}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Aktif: ${user.isActive}`);
      
      // Rolü güncelle
      if (user.role !== 'kasa') {
        user.role = 'kasa';
        await user.save();
        console.log('✅ Rol "kasa" olarak güncellendi');
      }
      
      // Aktif yap
      if (!user.isActive) {
        user.isActive = true;
        user.active = true;
        await user.save();
        console.log('✅ Kullanıcı aktif yapıldı');
      }
      
      // Şifreyi güncelle - passwordHash'i markModified ile işaretle
      user.passwordHash = password; // pre-save hook otomatik hashleyecek
      user.markModified('passwordHash'); // pre-save hook'un çalışması için
      await user.save();
      console.log(`✅ Şifre güncellendi: ${password}`);
      
      console.log('\n✅ Kullanıcı hazır!');
      console.log(`   Email: ${email}`);
      console.log(`   Şifre: ${password}`);
      console.log(`   Rol: ${user.role}`);
    } else {
      // Yeni kullanıcı oluştur
      user = new User({
        email,
        passwordHash: password, // pre-save hook otomatik hashleyecek
        name,
        role: 'kasa',
        isActive: true,
        active: true
      });
      
      await user.save();
      console.log('✅ Kasa kullanıcısı oluşturuldu!');
      console.log(`   Email: ${email}`);
      console.log(`   Şifre: ${password}`);
      console.log(`   Rol: kasa`);
      console.log(`   İsim: ${name}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
    console.log(`\n🔑 Giriş Bilgileri:`);
    console.log(`   Email: ${email}`);
    console.log(`   Şifre: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

createKasaUser();
