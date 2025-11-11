/**
 * User Role Update Script
 * 
 * Mevcut kullanıcılara role ekler veya günceller
 * 
 * Kullanım:
 *   node backend/scripts/updateUserRoles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function updateUserRoles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Tüm kullanıcıları bul
    const users = await User.find({});
    console.log(`📦 Toplam ${users.length} kullanıcı bulundu`);

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        let changed = false;

        // Role yoksa veya geçersizse admin yap (ilk kullanıcı için)
        const validRoles = ['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];
        if (!user.role || !validRoles.includes(user.role)) {
          // İlk kullanıcıyı admin yap, diğerlerini garson yap
          if (updated === 0) {
            user.role = 'admin';
            console.log(`✅ ${user.email} → admin rolü verildi`);
          } else {
            user.role = 'garson';
            console.log(`✅ ${user.email} → garson rolü verildi`);
          }
          changed = true;
        }

        // Name yoksa email'den oluştur
        if (!user.name) {
          user.name = user.email.split('@')[0];
          changed = true;
        }

        // Active yoksa true yap
        if (user.active === undefined) {
          user.active = true;
          changed = true;
        }

        if (changed) {
          await user.save();
          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`❌ ${user.email} güncellenirken hata:`, err.message);
      }
    }

    console.log('\n📊 Özet:');
    console.log(`   ✅ Güncellenen: ${updated}`);
    console.log(`   ⏭️  Atlanan: ${skipped}`);

    await mongoose.disconnect();
    console.log('✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

updateUserRoles();



