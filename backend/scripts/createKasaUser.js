/**
 * Kasa kullanıcısı oluştur
 *
 * Kullanım:
 *   KASA_EMAIL=kasa@example.com KASA_PASSWORD='GucluSifre1!' node scripts/createKasaUser.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { isStrongPassword } = require('../utils/authValidation');

async function createKasaUser() {
  const email = (process.env.KASA_EMAIL || process.argv[2] || '').trim().toLowerCase();
  const password = process.env.KASA_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error('❌ KASA_EMAIL ve KASA_PASSWORD (veya argv) gerekli.');
    process.exit(1);
  }
  if (!isStrongPassword(password)) {
    console.error('❌ Şifre politika gereksinimlerini karşılamıyor.');
    process.exit(1);
  }

  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI bulunamadı.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);

    let user = await User.findOne({ email });
    if (user) {
      user.role = 'kasa';
      user.isActive = true;
      user.passwordHash = password;
      await user.save();
      console.log(`✅ Kasa kullanıcısı güncellendi: ${email}`);
    } else {
      await User.create({
        email,
        passwordHash: password,
        name: process.env.KASA_NAME || 'Kasa Kullanıcı',
        role: 'kasa',
        isActive: true,
      });
      console.log(`✅ Kasa kullanıcısı oluşturuldu: ${email}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

createKasaUser();
