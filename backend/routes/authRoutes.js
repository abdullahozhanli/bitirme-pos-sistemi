const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Şifre karşılaştırma için
const jwt = require('jsonwebtoken'); // Token (Giriş Kartı) oluşturmak için

// Kullanıcı modelimizi import ediyoruz
const User = require('../models/User');

/**
 * @route   POST /api/auth/register
 * @desc    Yeni bir admin kullanıcısı kaydeder
 * @access  Public (İlk admini oluşturmak için şimdilik public)
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role = 'garson' } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    // Name yoksa email'den oluştur
    const userName = name || email.split('@')[0];
    
    // Role geçerliliğini kontrol et - yeni rolleri kullan
    const validRoles = ['superadmin', 'admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];
    // Eski roller için mapping
    const roleMapping = {
      'waiter': 'garson',
      'kitchen': 'mutfak'
    };
    const mappedRole = roleMapping[role] || role;
    const validRole = validRoles.includes(mappedRole) ? mappedRole : 'musteri';

    // passwordHash olarak kaydet (pre-save hook otomatik hashleyecek)
    user = new User({ 
      email, 
      passwordHash: password, // pre-save hook otomatik hashleyecek
      name: userName, 
      role: validRole 
    });
    await user.save();

    // JWT payload'a role, email, name ekle (direkt payload'da, user wrapper olmadan)
    const payload = { 
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '12h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
      }
    );

  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Admin kullanıcısının giriş yapmasını sağlar
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Email ve password kontrolü
    if (!email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre gerekli' });
    }

    // Kullanıcıyı bul - passwordHash ve branchId'yi de getir
    let user = await User.findOne({ email }).populate('branchId', 'name');
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz giriş bilgileri' });
    }

    // passwordHash kontrolü - eğer yoksa hata döndür
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      console.error('Kullanıcıda passwordHash yok veya geçersiz:', {
        email: user.email,
        passwordHash: !!user.passwordHash,
        passwordHashType: typeof user.passwordHash
      });
      return res.status(400).json({ message: 'Kullanıcı şifresi bulunamadı. Lütfen yönetici ile iletişime geçin.' });
    }

    // Aktif olmayan kullanıcı kontrolü
    if (!user.isActive) {
      return res.status(403).json({ message: 'Hesap devre dışı' });
    }

    // bcrypt.compare() için parametreleri kontrol et
    if (!password || typeof password !== 'string' || !user.passwordHash || typeof user.passwordHash !== 'string') {
      console.error('bcrypt.compare() için geçersiz parametreler:', {
        password: !!password,
        passwordType: typeof password,
        passwordHash: !!user.passwordHash,
        passwordHashType: typeof user.passwordHash
      });
      return res.status(400).json({ message: 'Geçersiz giriş bilgileri' });
    }

    // bcrypt.compare() hatasını yakala
    let isMatch;
    try {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } catch (bcryptError) {
      console.error('bcrypt.compare() hatası:', bcryptError);
      console.error('Parametreler:', {
        password: password ? `${password.substring(0, 3)}...` : 'undefined',
        passwordHash: user.passwordHash ? `${user.passwordHash.substring(0, 10)}...` : 'undefined'
      });
      return res.status(500).json({ message: 'Şifre kontrolü sırasında hata oluştu' });
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Geçersiz giriş bilgileri' });
    }

    // Eski rolleri yeni rollere çevir - SAVE'DEN ÖNCE YAPILMALI
    const roleMapping = {
      'waiter': 'garson',
      'kitchen': 'mutfak'
    };
    if (user.role && roleMapping[user.role]) {
      const oldRole = user.role;
      user.role = roleMapping[user.role];
      console.log(`🔄 ${user.email} rolü güncelleniyor: ${oldRole} → ${user.role}`);
      // Rol değişikliğini kaydet
      try {
        await user.save();
        console.log(`✅ ${user.email} rolü güncellendi: ${user.role}`);
      } catch (saveError) {
        console.error(`❌ Rol güncelleme hatası:`, saveError);
        // Hata olsa bile devam et, token oluştur
      }
    }

    // Admin yoksa ilk giriş yapan kullanıcıyı admin yap
    const adminCount = await User.countDocuments({ role: 'admin' });
    const validRoles = ['superadmin', 'admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];
    
    if (adminCount === 0 && user.role !== 'superadmin') {
      // Hiç admin yok ve kullanıcı superadmin değilse, bu kullanıcıyı admin yap
      user.role = 'admin';
      await user.save();
      console.log(`✅ ${user.email} kullanıcısı ilk admin olarak ayarlandı`);
    } else if (!user.role || !validRoles.includes(user.role)) {
      // Role yoksa veya geçersizse default olarak 'garson' ver
      user.role = 'garson';
      await user.save();
      console.log(`⚠️  ${user.email} kullanıcısına otomatik olarak 'garson' rolü verildi`);
    }
    // Superadmin rolü varsa değiştirme

    // Name kontrolü - yoksa email'den oluştur
    if (!user.name) {
      user.name = user.email.split('@')[0];
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        branchId: user.branchId ? user.branchId._id || user.branchId : null,
        branch: user.branchId ? {
          _id: user.branchId._id || user.branchId,
          name: user.branchId.name || null
        } : null
      }
    });

  } catch (error) {
    console.error(error.message);
    next(error);
  }
});


// Bu rotaları dışa aktarıyoruz
module.exports = router;