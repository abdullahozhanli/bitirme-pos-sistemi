/**
 * Superadmin kullanıcılarını listele
 * 
 * Kullanım: node scripts/listSuperAdmins.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function listSuperAdmins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const superAdmins = await User.find({ role: 'superadmin' }).select('-passwordHash -password').lean();

    if (superAdmins.length === 0) {
      console.log('❌ Hiç superadmin kullanıcı bulunamadı');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`📋 ${superAdmins.length} superadmin kullanıcı bulundu:\n`);
    
    superAdmins.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Ad: ${user.name || '-'}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Aktif: ${user.isActive ? 'Evet' : 'Hayır'}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✅ İşlem tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

listSuperAdmins();

