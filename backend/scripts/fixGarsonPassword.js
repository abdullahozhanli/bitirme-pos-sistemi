/**
 * Garson kullanıcısının şifresini düzelt
 * 
 * Kullanım:
 *   node backend/scripts/fixGarsonPassword.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function fixGarsonPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const email = 'garson@example.com';
    const password = 'garson123';

    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ Kullanıcı bulunamadı:', email);
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Kullanıcı bulundu:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   passwordHash var mı: ${!!user.passwordHash}`);
    console.log(`   passwordHash uzunluğu: ${user.passwordHash?.length || 0}`);
    
    // Düz metin şifreyi kaydet - pre-save hook otomatik hashleyecek
    // ÖNEMLİ: Düz metin şifreyi kaydet, pre-save hook hashleyecek
    user.passwordHash = password; // Düz metin şifre - pre-save hook hashleyecek
    user.isActive = true;
    user.active = true;
    user.role = 'garson';
    
    // passwordHash'i değiştirildi olarak işaretle ki pre-save hook çalışsın
    user.markModified('passwordHash');
    
    await user.save();
    
    console.log('\n✅ Şifre düzeltildi!');
    console.log(`   Email: ${email}`);
    console.log(`   Şifre: ${password}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   passwordHash: ${user.passwordHash.substring(0, 20)}...`);

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

fixGarsonPassword();

