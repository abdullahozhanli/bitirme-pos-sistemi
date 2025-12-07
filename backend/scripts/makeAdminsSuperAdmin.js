/**
 * Tüm admin kullanıcılarını superadmin yap
 * 
 * Kullanım: node scripts/makeAdminsSuperAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function makeAdminsSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Admin rolündeki kullanıcıları bul
    const admins = await User.find({ role: 'admin' }).select('-passwordHash -password').lean();

    if (admins.length === 0) {
      console.log('❌ Hiç admin kullanıcı bulunamadı');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`📋 ${admins.length} admin kullanıcı bulundu:\n`);
    
    admins.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name || '-'})`);
    });

    console.log('\n🔄 Admin kullanıcıları superadmin yapılıyor...\n');

    // Tüm admin'leri superadmin yap ve branchId'yi null yap
    const result = await User.updateMany(
      { role: 'admin' },
      { 
        $set: { 
          role: 'superadmin',
          branchId: null // Süper admin'ler branch'e bağlı değil
        } 
      }
    );

    console.log(`✅ ${result.modifiedCount} admin kullanıcı superadmin yapıldı\n`);

    // Güncellenmiş kullanıcıları göster
    const updatedUsers = await User.find({ role: 'superadmin' }).select('-passwordHash -password').lean();
    console.log('📋 Superadmin kullanıcılar:');
    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name || '-'})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

makeAdminsSuperAdmin();

