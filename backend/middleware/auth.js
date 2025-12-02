const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  try {
    // Önce x-auth-token'ı kontrol et (legacy support)
    let token = req.headers['x-auth-token'];
    
    // Sonra Authorization Bearer'ı kontrol et
    if (!token) {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        token = header.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'Token bulunamadı' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı' });
    }

    // Debug log'ları kaldırıldı (production için)

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    };

    next();
  } catch (err) {
    console.error('auth middleware error', err);
    return res.status(401).json({ message: 'Yetkisiz erişim' });
  }
};

