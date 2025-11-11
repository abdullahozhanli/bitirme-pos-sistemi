const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token bulunamadı' });
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı' });
    }

    // Debug: user ve role bilgisini logla
    console.log('🔍 auth middleware:', {
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      userRoleType: typeof user.role,
      isActive: user.isActive
    });

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

