/**
 * Mevcut kullanıcıların password alanını passwordHash'e kopyala
 * 
 * Kullanım:
 *   node backend/scripts/migratePasswordToPasswordHash.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function migratePasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // passwordHash'i olmayan ama password'u olan kullanıcıları bul
    const users = await User.find({
      $or: [
        { passwordHash: { $exists: false } },
        { passwordHash: null },
        { passwordHash: '' }
      ]
    });
    
    if (users.length === 0) {
      console.log('✅ Tüm kullanıcıların passwordHash alanı mevcut');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 ${users.length} kullanıcı bulundu (passwordHash eksik)\n`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      console.log(`🔍 Kontrol ediliyor: ${user.email}`);
      console.log(`   password var mı: ${!!user.password}`);
      console.log(`   password tipi: ${typeof user.password}`);
      console.log(`   password uzunluğu: ${user.password?.length || 0}`);
      console.log(`   passwordHash var mı: ${!!user.passwordHash}`);

      // password varsa ve geçerliyse passwordHash'e kopyala
      if (user.password && typeof user.password === 'string' && user.password.length > 0) {
        // Eğer password zaten hashlenmişse (bcrypt hash'i $2 ile başlar)
        if (user.password.startsWith('$2')) {
          user.passwordHash = user.password;
          await user.save();
          console.log(`   ✅ passwordHash'e kopyalandı (zaten hashlenmiş)`);
          migrated++;
        } else {
          // Düz metin şifre varsa, pre-save hook hashleyecek
          user.passwordHash = user.password;
          await user.save();
          console.log(`   ✅ passwordHash'e kopyalandı (hashlenecek)`);
          migrated++;
        }
      } else {
        console.log(`   ⚠️  password alanı yok veya geçersiz, atlanıyor`);
        skipped++;
      }
      
      console.log('');
    }

    console.log('\n=== Özet ===');
    console.log(`Migrate edilen: ${migrated}`);
    console.log(`Atlanan: ${skipped}`);
    console.log(`Toplam: ${users.length}`);

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

migratePasswords();

