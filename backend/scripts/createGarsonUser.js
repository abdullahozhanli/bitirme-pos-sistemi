/**
 * Garson kullanıcısı oluştur
 *
 * Kullanım:
 *   GARSON_EMAIL=garson@example.com GARSON_PASSWORD='GucluSifre1!' node scripts/createGarsonUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { isStrongPassword } = require('../utils/authValidation');

async function createGarsonUser() {
  const email = (process.env.GARSON_EMAIL || process.argv[2] || '').trim().toLowerCase();
  const password = process.env.GARSON_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error('❌ GARSON_EMAIL ve GARSON_PASSWORD (veya argv) gerekli.');
    process.exit(1);
  }
  if (!isStrongPassword(password)) {
    console.error('❌ Şifre politika gereksinimlerini karşılamıyor.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    let user = await User.findOne({ email });
    if (user) {
      user.role = 'garson';
      user.isActive = true;
      user.passwordHash = password;
      await user.save();
      console.log(`✅ Garson kullanıcısı güncellendi: ${email}`);
    } else {
      await User.create({
        email,
        passwordHash: password,
        name: process.env.GARSON_NAME || 'Garson Kullanıcı',
        role: 'garson',
        isActive: true,
      });
      console.log(`✅ Garson kullanıcısı oluşturuldu: ${email}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

createGarsonUser();
