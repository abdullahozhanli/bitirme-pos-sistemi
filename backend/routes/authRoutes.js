const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Şifre karşılaştırma için
const jwt = require('jsonwebtoken'); // Token (Giriş Kartı) oluşturmak için

// Kullanıcı modelimizi import ediyoruz
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { loginLimiter, registerLimiter, setupFirstAdminLimiter } = require('../middleware/rateLimiter');
const { validateLogin, validateRegister, validateSetupFirstAdmin } = require('../middleware/validators');

/**
 * @route   POST /api/auth/setup-first-admin
 * @desc    İlk admin kullanıcısını oluşturur (sadece veritabanında admin yoksa çalışır)
 * @access  Public (sadece ilk kurulum için)
 */
router.post('/setup-first-admin', setupFirstAdminLimiter, validateSetupFirstAdmin, async (req, res, next) => {
  try {
    // Veritabanında admin var mı kontrol et
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(403).json({ 
        message: 'İlk admin zaten oluşturulmuş. Yeni kullanıcılar için /api/auth/register endpoint\'ini kullanın (admin girişi gerekli).' 
      });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre gerekli' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    // Name yoksa email'den oluştur
    const userName = name || email.split('@')[0];

    // İlk admin oluştur
    user = new User({ 
      email, 
      passwordHash: password, // pre-save hook otomatik hashleyecek
      name: userName, 
      role: 'admin' // İlk kullanıcı her zaman admin
    });
    await user.save();

    // JWT payload'a role, email, name ekle
    const payload = { 
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    };

    // Access token (1 saat) ve refresh token (7 gün) oluştur
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      token: accessToken,
      refreshToken: refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: 'İlk admin kullanıcısı başarıyla oluşturuldu'
    });

  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Yeni bir kullanıcı kaydeder (sadece admin kullanıcılar)
 * @access  Private (Admin only)
 */
router.post('/register', registerLimiter, authMiddleware, requireRole('admin'), validateRegister, async (req, res, next) => {
  try {
    const { email, password, name, role = 'garson' } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    // Name yoksa email'den oluştur
    const userName = name || email.split('@')[0];
    
    // Role geçerliliğini kontrol et - yeni rolleri kullan
    const validRoles = ['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];
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

    // Access token (1 saat) ve refresh token (7 gün) oluştur
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      token: accessToken,
      refreshToken: refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });

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
router.post('/login', loginLimiter, validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Email ve password kontrolü
    if (!email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre gerekli' });
    }

    // Kullanıcıyı bul - passwordHash'i de getir
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz giriş bilgileri' });
    }

    // passwordHash kontrolü - eğer yoksa hata döndür
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      // Production'da hassas bilgileri loglama
      if (process.env.NODE_ENV === 'development') {
        console.error('Kullanıcıda passwordHash yok veya geçersiz:', {
          email: user.email,
          passwordHash: !!user.passwordHash,
          passwordHashType: typeof user.passwordHash
        });
      } else {
        console.error('Kullanıcıda passwordHash yok:', user.email);
      }
      return res.status(400).json({ message: 'Kullanıcı şifresi bulunamadı. Lütfen yönetici ile iletişime geçin.' });
    }

    // Aktif olmayan kullanıcı kontrolü
    if (!user.isActive) {
      return res.status(403).json({ message: 'Hesap devre dışı' });
    }

    // bcrypt.compare() için parametreleri kontrol et
    if (!password || typeof password !== 'string' || !user.passwordHash || typeof user.passwordHash !== 'string') {
      // Production'da hassas bilgileri loglama
      if (process.env.NODE_ENV === 'development') {
        console.error('bcrypt.compare() için geçersiz parametreler:', {
          password: !!password,
          passwordType: typeof password,
          passwordHash: !!user.passwordHash,
          passwordHashType: typeof user.passwordHash
        });
      }
      return res.status(400).json({ message: 'Geçersiz giriş bilgileri' });
    }

    // bcrypt.compare() hatasını yakala
    let isMatch;
    try {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } catch (bcryptError) {
      // Production'da hassas bilgileri loglama
      if (process.env.NODE_ENV === 'development') {
        console.error('bcrypt.compare() hatası:', bcryptError);
      } else {
        console.error('bcrypt.compare() hatası:', bcryptError.message);
      }
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
    if (adminCount === 0) {
      // Hiç admin yok, bu kullanıcıyı admin yap
      user.role = 'admin';
      await user.save();
      console.log(`✅ ${user.email} kullanıcısı ilk admin olarak ayarlandı`);
    } else if (!user.role || !['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'].includes(user.role)) {
      // Role yoksa veya geçersizse default olarak 'garson' ver
      user.role = 'garson';
      await user.save();
      console.log(`⚠️  ${user.email} kullanıcısına otomatik olarak 'garson' rolü verildi`);
    }

    // Name kontrolü - yoksa email'den oluştur
    if (!user.name) {
      user.name = user.email.split('@')[0];
      await user.save();
    }

    // Access token (1 saat) ve refresh token (7 gün) oluştur
    const accessToken = jwt.sign({ 
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    const refreshToken = jwt.sign({ 
      id: user._id,
      type: 'refresh'
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh token ile yeni access token alır
 * @access  Public
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token gereklidir' });
    }

    // Refresh token'ı doğrula
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş refresh token' });
    }

    // Refresh token tipini kontrol et
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Geçersiz token tipi' });
    }

    // Kullanıcıyı bul
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı veya devre dışı' });
    }

    // Yeni access token oluştur
    const accessToken = jwt.sign({ 
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error(error.message);
    next(error);
  }
});


// Bu rotaları dışa aktarıyoruz
module.exports = router;