/**
 * Tüm kullanıcıları listele
 * 
 * Kullanım: node scripts/listAllUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function listAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const users = await User.find({}).select('-passwordHash -password').sort({ role: 1, email: 1 }).lean();

    if (users.length === 0) {
      console.log('❌ Hiç kullanıcı bulunamadı');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`📋 ${users.length} kullanıcı bulundu:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Ad: ${user.name || '-'}`);
      console.log(`   Rol: ${user.role || '-'}`);
      console.log(`   Aktif: ${user.isActive ? 'Evet' : 'Hayır'}`);
      console.log(`   BranchId: ${user.branchId || 'Yok'}`);
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

listAllUsers();








