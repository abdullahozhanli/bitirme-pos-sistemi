/**
 * Garson kullanıcısı oluştur
 * 
 * Kullanım:
 *   node backend/scripts/createGarsonUser.js
 *   node backend/scripts/createGarsonUser.js garson@example.com password123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createGarsonUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const email = process.argv[2] || 'garson@example.com';
    const password = process.argv[3] || 'garson123';
    const name = 'Garson Kullanıcı';

    // Kullanıcı var mı kontrol et
    let user = await User.findOne({ email });
    
    if (user) {
      console.log(`⚠️  Kullanıcı zaten var: ${email}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Aktif: ${user.isActive}`);
      
      // Rolü güncelle
      if (user.role !== 'garson') {
        user.role = 'garson';
        await user.save();
        console.log('✅ Rol "garson" olarak güncellendi');
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
        role: 'garson',
        isActive: true,
        active: true
      });
      
      await user.save();
      console.log('✅ Garson kullanıcısı oluşturuldu!');
      console.log(`   Email: ${email}`);
      console.log(`   Şifre: ${password}`);
      console.log(`   Rol: garson`);
      console.log(`   İsim: ${name}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

createGarsonUser();

