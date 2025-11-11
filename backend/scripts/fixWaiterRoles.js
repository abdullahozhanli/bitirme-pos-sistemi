/**
 * 'waiter' rolünü 'garson' olarak güncelle
 * 
 * Kullanım:
 *   node backend/scripts/fixWaiterRoles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixWaiterRoles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // 'waiter' rolündeki kullanıcıları bul
    const users = await User.find({ role: 'waiter' });
    
    if (users.length === 0) {
      console.log('✅ "waiter" rolünde kullanıcı bulunamadı');
    } else {
      console.log(`📋 ${users.length} kullanıcı bulundu (waiter rolü)\n`);
      
      for (const user of users) {
        console.log(`🔍 Güncelleniyor: ${user.email}`);
        console.log(`   Eski rol: ${user.role}`);
        
        user.role = 'garson';
        await user.save();
        
        console.log(`   ✅ Yeni rol: ${user.role}\n`);
      }
    }

    // 'kitchen' rolündeki kullanıcıları 'mutfak' olarak güncelle
    const kitchenUsers = await User.find({ role: 'kitchen' });
    
    if (kitchenUsers.length === 0) {
      console.log('✅ "kitchen" rolünde kullanıcı bulunamadı');
    } else {
      console.log(`📋 ${kitchenUsers.length} kullanıcı bulundu (kitchen rolü)\n`);
      
      for (const user of kitchenUsers) {
        console.log(`🔍 Güncelleniyor: ${user.email}`);
        console.log(`   Eski rol: ${user.role}`);
        
        user.role = 'mutfak';
        await user.save();
        
        console.log(`   ✅ Yeni rol: ${user.role}\n`);
      }
    }

    await mongoose.disconnect();
    console.log('✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

fixWaiterRoles();

