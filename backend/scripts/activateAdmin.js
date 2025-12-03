/**
 * Admin kullanıcısını aktif yap ve şifresini ayarla
 * 
 * Kullanım:
 *   node backend/scripts/activateAdmin.js <email> <password>
 * 
 * Örnek:
 *   node backend/scripts/activateAdmin.js admin@pos.com admin123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function activateAdmin() {
  try {
    const email = process.argv[2] || 'admin@pos.com';
    const password = process.argv[3] || 'admin123';
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ ${email} adresine sahip kullanıcı bulunamadı`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`📋 Kullanıcı bulundu: ${user.email}`);
    console.log(`   Mevcut rol: ${user.role}`);
    console.log(`   Mevcut durum: ${user.isActive ? 'Aktif' : 'Pasif'}\n`);

    // Aktif yap
    if (!user.isActive) {
      user.isActive = true;
      console.log('✅ Kullanıcı aktif yapıldı');
    }

    // Şifreyi güncelle
    user.passwordHash = password; // pre-save hook otomatik hashleyecek
    user.markModified('passwordHash');
    console.log(`✅ Şifre güncellendi: ${password}`);

    await user.save();

    console.log('\n✅ Admin kullanıcısı hazır!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Şifre: ${password}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   Durum: Aktif\n`);

    await mongoose.disconnect();
    console.log('✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

activateAdmin();

