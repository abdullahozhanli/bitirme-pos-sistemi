const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Şifre karşılaştırma için
const jwt = require('jsonwebtoken'); // Token (Giriş Kartı) oluşturmak için

const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadAvatar');
const {
  deleteAvatarFileIfManaged,
  publicPathForFilename,
  resolveAvatarUrlForClient,
} = require('../utils/avatarStorage');
const {
  isValidEmail,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} = require('../utils/authValidation');

function userPayload(req, doc) {
  const pts = doc.loyaltyPoints != null ? doc.loyaltyPoints : 0;
  return {
    id: doc._id || doc.id,
    email: doc.email,
    name: doc.name,
    role: doc.role,
    points: pts,
    loyaltyPoints: pts,
    avatarUrl: req ? resolveAvatarUrlForClient(req, doc.avatarUrl || '') : doc.avatarUrl || '',
    passwordMeetsPolicy: doc.passwordMeetsPolicy === true,
  };
}

function meResponse(req, user) {
  const pts = user.loyaltyPoints != null ? user.loyaltyPoints : 0;
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name,
    branchId: user.branchId ? user.branchId._id || user.branchId : null,
    branch: user.branchId
      ? { _id: user.branchId._id || user.branchId, name: user.branchId.name || null }
      : null,
    points: pts,
    loyaltyPoints: pts,
    avatarUrl: resolveAvatarUrlForClient(req, user.avatarUrl || ''),
    passwordMeetsPolicy: user.passwordMeetsPolicy === true,
  };
}

/**
 * @route   GET /api/auth/me
 * @desc    Giriş yapmış kullanıcının güncel profili (parapuan dahil)
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).populate('branchId', 'name').select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json(meResponse(req, user));
  } catch (e) {
    next(e);
  }
});

/**
 * @route   POST /api/auth/me/avatar
 * @desc    Profil fotoğrafı yükle (multipart, kalıcı dosya + URL)
 */
router.post(
  '/me/avatar',
  authMiddleware,
  (req, res, next) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Yükleme hatası' });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Fotoğraf dosyası gerekli' });
      }
      const userId = req.user.id || req.user._id;
      const user = await User.findById(userId).populate('branchId', 'name');
      if (!user) {
        return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
      }

      const previous = user.avatarUrl;
      user.avatarUrl = publicPathForFilename(req.file.filename);
      await user.save();
      deleteAvatarFileIfManaged(previous);

      const fresh = await User.findById(userId)
        .populate('branchId', 'name')
        .select('-passwordHash');
      res.json(meResponse(req, fresh));
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @route   DELETE /api/auth/me/avatar
 * @desc    Profil fotoğrafını kaldır
 */
router.delete('/me/avatar', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).populate('branchId', 'name');
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    deleteAvatarFileIfManaged(user.avatarUrl);
    user.avatarUrl = '';
    await user.save();

    const fresh = await User.findById(userId)
      .populate('branchId', 'name')
      .select('-passwordHash');
    res.json(meResponse(req, fresh));
  } catch (e) {
    next(e);
  }
});

/**
 * @route   PATCH /api/auth/me
 * @desc    Profil güncelle (isim; avatar için POST /me/avatar kullanın)
 */
router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).populate('branchId', 'name');
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const { name } = req.body || {};
    if (typeof name === 'string') {
      const t = name.trim();
      if (t) user.name = t;
    }

    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'avatarUrl')) {
      const raw = req.body.avatarUrl;
      if (raw === null || raw === '') {
        deleteAvatarFileIfManaged(user.avatarUrl);
        user.avatarUrl = '';
      } else if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) {
          deleteAvatarFileIfManaged(user.avatarUrl);
          user.avatarUrl = '';
        } else if (trimmed.startsWith('/uploads/avatars/')) {
          user.avatarUrl = trimmed;
        } else {
          return res.status(400).json({
            message: 'Profil fotoğrafı için POST /api/auth/me/avatar kullanın',
          });
        }
      }
    }

    await user.save();
    const fresh = await User.findById(userId).populate('branchId', 'name').select('-passwordHash');
    res.json(meResponse(req, fresh));
  } catch (e) {
    next(e);
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Yeni müşteri kaydı (e-posta + güçlü şifre)
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const emailTrim = String(email || '').trim().toLowerCase();
    if (!emailTrim || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre gerekli' });
    }
    if (!isValidEmail(emailTrim)) {
      return res.status(400).json({ message: 'Geçerli bir e-posta adresi girin' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    let user = await User.findOne({ email: emailTrim });
    if (user) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    const userName = (name && String(name).trim()) || emailTrim.split('@')[0];

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable bulunamadı!');
      return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
    }

    user = new User({
      email: emailTrim,
      passwordHash: password,
      name: userName,
      role: 'musteri',
      passwordMeetsPolicy: true,
    });
    await user.save();

    const payload = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token, user: userPayload(req, user) });
      }
    );
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor' });
    }
    console.error(error.message);
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    E-posta ve şifre ile giriş
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  try {
    const emailRaw = String(req.body.email ?? req.body.identifier ?? '').trim().toLowerCase();
    const { password } = req.body;

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable bulunamadı!');
      return res.status(500).json({ message: 'Sunucu yapılandırma hatası. Lütfen yönetici ile iletişime geçin.' });
    }

    if (!emailRaw || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre gerekli' });
    }

    if (!isValidEmail(emailRaw)) {
      return res.status(400).json({ message: 'Geçerli bir e-posta adresi girin' });
    }

    const user = await User.findOne({ email: emailRaw }).populate('branchId', 'name');

    if (!user) {
      return res.status(400).json({ message: 'Geçersiz giriş bilgileri' });
    }

    console.log(`🔍 Kullanıcı bulundu: ${user.email}, Rol: ${user.role}, Aktif: ${user.isActive}`);

    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      console.error('Kullanıcıda passwordHash yok veya geçersiz:', {
        email: user.email,
        passwordHash: !!user.passwordHash,
        passwordHashType: typeof user.passwordHash,
      });
      return res.status(400).json({ message: 'Kullanıcı şifresi bulunamadı. Lütfen yönetici ile iletişime geçin.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Hesap devre dışı' });
    }

    if (!password || typeof password !== 'string' || !user.passwordHash || typeof user.passwordHash !== 'string') {
      console.error('bcrypt.compare() için geçersiz parametreler:', {
        password: !!password,
        passwordType: typeof password,
        passwordHash: !!user.passwordHash,
        passwordHashType: typeof user.passwordHash,
      });
      return res.status(400).json({ message: 'Geçersiz giriş bilgileri' });
    }

    let isMatch;
    try {
      isMatch = await bcrypt.compare(password, user.passwordHash);
      console.log(`🔐 Şifre kontrolü: ${isMatch ? '✅ Eşleşti' : '❌ Eşleşmedi'}`);
    } catch (bcryptError) {
      console.error('bcrypt.compare() hatası:', bcryptError);
      console.error('Parametreler:', {
        password: password ? `${password.substring(0, 3)}...` : 'undefined',
        passwordHash: user.passwordHash ? `${user.passwordHash.substring(0, 10)}...` : 'undefined',
      });
      return res.status(500).json({ message: 'Şifre kontrolü sırasında hata oluştu' });
    }

    if (!isMatch) {
      console.error(
        `❌ Şifre yanlış - Giriş: ${emailRaw}, Kullanıcı bulundu: ${!!user}, passwordHash var: ${!!user.passwordHash}`
      );
      return res.status(400).json({ message: 'Geçersiz giriş bilgileri' });
    }

    if (isStrongPassword(password)) {
      if (user.passwordMeetsPolicy !== true) {
        user.passwordMeetsPolicy = true;
        try {
          await user.save();
        } catch (e) {
          console.error('passwordMeetsPolicy güncellenemedi', e);
        }
      }
    }

    const roleMapping = {
      waiter: 'garson',
      kitchen: 'mutfak',
    };
    if (user.role && roleMapping[user.role]) {
      const oldRole = user.role;
      user.role = roleMapping[user.role];
      console.log(`🔄 ${user.email} rolü güncelleniyor: ${oldRole} → ${user.role}`);
      try {
        await user.save();
        console.log(`✅ ${user.email} rolü güncellendi: ${user.role}`);
      } catch (saveError) {
        console.error('❌ Rol güncelleme hatası:', saveError);
      }
    }

    const adminCount = await User.countDocuments({ role: 'admin' });
    const validRoles = ['superadmin', 'admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];

    if (user.role === 'superadmin') {
      console.log(`✅ ${user.email} superadmin olarak giriş yapıyor`);
    } else if (adminCount === 0) {
      user.role = 'admin';
      await user.save();
      console.log(`✅ ${user.email} kullanıcısı ilk admin olarak ayarlandı`);
    } else if (!user.role || !validRoles.includes(user.role)) {
      user.role = 'garson';
      await user.save();
      console.log(`⚠️  ${user.email} kullanıcısına otomatik olarak 'garson' rolü verildi`);
    }

    if (!user.name) {
      user.name = user.email.split('@')[0];
      await user.save();
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable bulunamadı!');
      return res.status(500).json({ message: 'Sunucu yapılandırma hatası. Lütfen yönetici ile iletişime geçin.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log(`✅ Token oluşturuldu: ${user.email} (${user.role})`);
    const pts = user.loyaltyPoints != null ? user.loyaltyPoints : 0;
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        branchId: user.branchId ? user.branchId._id || user.branchId : null,
        branch: user.branchId
          ? {
              _id: user.branchId._id || user.branchId,
              name: user.branchId.name || null,
            }
          : null,
        points: pts,
        loyaltyPoints: pts,
        avatarUrl: resolveAvatarUrlForClient(req, user.avatarUrl || ''),
        passwordMeetsPolicy: user.passwordMeetsPolicy === true,
      },
    });
  } catch (error) {
    console.error('❌ Login hatası:', error);
    console.error('Error stack:', error.stack);
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      console.error('MongoDB hatası:', error.message);
      return res.status(500).json({ message: 'Veritabanı hatası. Lütfen tekrar deneyin.' });
    }
    if (error.name === 'JsonWebTokenError') {
      console.error('JWT hatası:', error.message);
      return res.status(500).json({ message: 'Token oluşturma hatası. Lütfen tekrar deneyin.' });
    }
    return res.status(500).json({ message: error.message || 'Giriş sırasında bir hata oluştu' });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Mevcut şifre doğrulaması + güçlü yeni şifre (tüm roller)
 */
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mevcut şifre ve yeni şifre gerekli' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const user = await User.findById(userId);
    if (!user || !user.passwordHash) {
      return res.status(400).json({ message: 'Bu hesap için şifre değiştirilemiyor' });
    }
    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Mevcut şifre hatalı' });
    }
    user.passwordHash = String(newPassword);
    user.passwordMeetsPolicy = true;
    await user.save();
    res.json({ ok: true, passwordMeetsPolicy: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
