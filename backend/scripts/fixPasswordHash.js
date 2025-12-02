const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // passwordHash olmayan ama password'u olan kullanıcıları bul
    const users = await User.find({
      $or: [
        { passwordHash: { $exists: false } },
        { passwordHash: null },
        { passwordHash: '' }
      ],
      password: { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`\n📊 Toplam ${users.length} kullanıcı bulundu (passwordHash yok ama password var)`);

    if (users.length === 0) {
      console.log('✅ Tüm kullanıcılar zaten passwordHash\'e sahip');
      await mongoose.disconnect();
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // password'u passwordHash'e kopyala
        if (user.password && !user.passwordHash) {
          user.passwordHash = user.password;
          await user.save();
          updated++;
          console.log(`✅ ${user.email} → passwordHash'e kopyalandı`);
        } else {
          skipped++;
          console.log(`⏭️  ${user.email} → atlandı (zaten passwordHash var veya password yok)`);
        }
      } catch (error) {
        console.error(`❌ ${user.email} güncellenirken hata:`, error.message);
      }
    }

    console.log('\n=== Özet ===');
    console.log(`✅ Güncellenen: ${updated}`);
    console.log(`⏭️  Atlanan: ${skipped}`);
    console.log(`📊 Toplam: ${users.length}`);

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
})();
















