/**
 * Admin kullanıcısının branchId'sini kontrol et ve düzelt
 * 
 * Kullanım: node scripts/checkAdminBranch.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');

async function checkAdminBranch() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Admin kullanıcılarını bul
    const admins = await User.find({ role: 'admin' }).select('-passwordHash -password').lean();

    if (admins.length === 0) {
      console.log('❌ Hiç admin kullanıcı bulunamadı');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Default branch'i bul
    const defaultBranch = await Branch.findOne({ name: 'Default Branch' });
    if (!defaultBranch) {
      console.log('❌ Default Branch bulunamadı. Migration script\'ini çalıştırın.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`📋 ${admins.length} admin kullanıcı bulundu:\n`);
    
    for (const admin of admins) {
      console.log(`👤 ${admin.email}`);
      console.log(`   Mevcut BranchId: ${admin.branchId || 'YOK'}`);
      
      if (!admin.branchId) {
        console.log(`   ⚠️  BranchId yok, default branch atanıyor...`);
        await User.findByIdAndUpdate(admin._id, { branchId: defaultBranch._id });
        console.log(`   ✅ BranchId atandı: ${defaultBranch._id}`);
      } else {
        // BranchId var, geçerli mi kontrol et
        const branch = await Branch.findById(admin.branchId);
        if (!branch) {
          console.log(`   ⚠️  BranchId geçersiz, default branch atanıyor...`);
          await User.findByIdAndUpdate(admin._id, { branchId: defaultBranch._id });
          console.log(`   ✅ BranchId güncellendi: ${defaultBranch._id}`);
        } else {
          console.log(`   ✅ BranchId geçerli: ${branch.name}`);
        }
      }
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ İşlem tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

checkAdminBranch();









