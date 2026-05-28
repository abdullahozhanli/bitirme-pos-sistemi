/**
 * Superadmin bootstrap — şifre ve e-posta ortam değişkenlerinden
 *
 * Kullanım:
 *   SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='GucluSifre1!' node scripts/createSuperAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { isStrongPassword } = require('../utils/authValidation');

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Admin';

async function createSuperAdmin() {
  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.error('❌ SUPERADMIN_EMAIL ve SUPERADMIN_PASSWORD ortam değişkenleri gerekli.');
    process.exit(1);
  }
  if (!isStrongPassword(SUPERADMIN_PASSWORD)) {
    console.error('❌ SUPERADMIN_PASSWORD politika gereksinimlerini karşılamıyor (8+ karakter, büyük/küçük/rakam/sembol).');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    const email = SUPERADMIN_EMAIL.toLowerCase().trim();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.role = 'superadmin';
      existingUser.branchId = null;
      existingUser.passwordHash = SUPERADMIN_PASSWORD;
      existingUser.name = SUPERADMIN_NAME;
      existingUser.isActive = true;
      await existingUser.save();
      console.log(`✅ Mevcut kullanıcı güncellendi: ${email}`);
    } else {
      await User.create({
        email,
        passwordHash: SUPERADMIN_PASSWORD,
        name: SUPERADMIN_NAME,
        role: 'superadmin',
        branchId: null,
        isActive: true,
      });
      console.log(`✅ Yeni superadmin oluşturuldu: ${email}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı (şifre konsola yazdırılmaz).');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();
