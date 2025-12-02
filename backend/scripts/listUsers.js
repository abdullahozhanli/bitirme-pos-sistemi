/**
 * Tüm kullanıcıları listele
 * 
 * Kullanım:
 *   node backend/scripts/listUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Tüm kullanıcıları bul
    const users = await User.find({}).select('email role name active');
    
    if (users.length === 0) {
      console.log('❌ Hiç kullanıcı bulunamadı');
      console.log('\n💡 Yeni kullanıcı oluşturmak için:');
      console.log('   POST /api/auth/register');
      console.log('   Body: { email, password, name, role }');
    } else {
      console.log(`📋 Toplam ${users.length} kullanıcı bulundu:\n`);
      users.forEach((u, i) => {
        const roleIcon = u.role === 'admin' ? '👑' : u.role === 'waiter' ? '🍽️' : '👨‍🍳';
        const statusIcon = u.active ? '✅' : '❌';
        console.log(`${i + 1}. ${roleIcon} ${u.email}`);
        console.log(`   Rol: ${u.role}`);
        console.log(`   İsim: ${u.name || 'Yok'}`);
        console.log(`   Durum: ${statusIcon} ${u.active ? 'Aktif' : 'Pasif'}`);
        console.log('');
      });
      
      // Admin kullanıcıları
      const admins = users.filter(u => u.role === 'admin');
      if (admins.length > 0) {
        console.log('👑 Admin Kullanıcıları:');
        admins.forEach(a => {
          console.log(`   - ${a.email}`);
        });
      } else {
        console.log('⚠️  Hiç admin kullanıcı yok!');
        console.log('💡 Admin yapmak için:');
        console.log('   node backend/scripts/makeUserAdmin.js <email>');
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ İşlem tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

listUsers();



















