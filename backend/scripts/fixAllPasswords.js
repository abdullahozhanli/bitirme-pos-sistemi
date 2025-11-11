/**
 * Tüm kullanıcıların şifrelerini kontrol et ve düzelt
 * 
 * Kullanım:
 *   node backend/scripts/fixAllPasswords.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixAllPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Tüm kullanıcıları bul
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('❌ Hiç kullanıcı bulunamadı');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 ${users.length} kullanıcı bulundu\n`);

    for (const user of users) {
      console.log(`🔍 Kontrol ediliyor: ${user.email}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   passwordHash var mı: ${!!user.passwordHash}`);
      console.log(`   passwordHash tipi: ${typeof user.passwordHash}`);
      console.log(`   passwordHash uzunluğu: ${user.passwordHash?.length || 0}`);

      // passwordHash yoksa veya geçersizse düzelt
      if (!user.passwordHash || typeof user.passwordHash !== 'string' || user.passwordHash.length < 10) {
        console.log(`   ⚠️  passwordHash eksik veya geçersiz, düzeltiliyor...`);
        
        // Varsayılan şifre: email'in ilk kısmı + "123"
        const defaultPassword = user.email.split('@')[0] + '123';
        
        // Düz metin şifreyi kaydet - pre-save hook otomatik hashleyecek
        user.passwordHash = defaultPassword;
        user.markModified('passwordHash');
        await user.save();
        
        console.log(`   ✅ Şifre düzeltildi: ${defaultPassword}`);
      } else {
        console.log(`   ✅ passwordHash geçerli`);
      }
      
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

fixAllPasswords();

