/**
 * Yeni superadmin kullanıcı oluştur
 * 
 * Kullanım: node scripts/createSuperAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const SUPERADMIN_EMAIL = 'abdullahozhanli292@gmail.com';
const SUPERADMIN_PASSWORD = 'apo12345';
const SUPERADMIN_NAME = 'Abdullah Özhanlı';

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Kullanıcı zaten var mı kontrol et
    const existingUser = await User.findOne({ email: SUPERADMIN_EMAIL.toLowerCase() });
    
    if (existingUser) {
      console.log(`ℹ️  Kullanıcı zaten mevcut: ${SUPERADMIN_EMAIL}`);
      console.log(`   Mevcut rol: ${existingUser.role}`);
      
      // Superadmin yap ve branchId'yi null yap
      existingUser.role = 'superadmin';
      existingUser.branchId = null;
      existingUser.passwordHash = SUPERADMIN_PASSWORD; // pre-save hook otomatik hashleyecek
      existingUser.name = SUPERADMIN_NAME;
      existingUser.isActive = true;
      await existingUser.save();
      
      console.log(`✅ Kullanıcı superadmin yapıldı ve şifre güncellendi\n`);
    } else {
      // Yeni kullanıcı oluştur
      const user = new User({
        email: SUPERADMIN_EMAIL.toLowerCase(),
        passwordHash: SUPERADMIN_PASSWORD, // pre-save hook otomatik hashleyecek
        name: SUPERADMIN_NAME,
        role: 'superadmin',
        branchId: null, // Süper admin'ler branch'e bağlı değil
        isActive: true,
      });

      await user.save();
      console.log(`✅ Yeni superadmin kullanıcı oluşturuldu\n`);
    }

    // Superadmin kullanıcıyı göster
    const superAdmin = await User.findOne({ email: SUPERADMIN_EMAIL.toLowerCase() }).select('-passwordHash -password').lean();
    console.log('📋 Superadmin Kullanıcı Bilgileri:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Ad: ${superAdmin.name}`);
    console.log(`   Rol: ${superAdmin.role}`);
    console.log(`   Aktif: ${superAdmin.isActive ? 'Evet' : 'Hayır'}`);
    console.log(`   BranchId: ${superAdmin.branchId || 'Yok (Superadmin)'}`);

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
    console.log(`\n🔑 Giriş Bilgileri:`);
    console.log(`   Email: ${SUPERADMIN_EMAIL}`);
    console.log(`   Şifre: ${SUPERADMIN_PASSWORD}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

createSuperAdmin();









