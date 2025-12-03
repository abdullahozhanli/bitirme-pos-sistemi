const jwt = require('jsonwebtoken');

function getTokenFromHeaders(req) {
  // Önce x-auth-token'ı kontrol et
  const legacy = req.headers['x-auth-token'];
  if (legacy) return legacy;
  // Sonra Authorization Bearer'ı kontrol et
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) return auth.substring(7);
  return null;
}

function authMiddleware(req, res, next) {
  try {
    const token = getTokenFromHeaders(req);
    if (!token) return res.status(401).json({ message: 'Yetkisiz: token yok' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Token'dan id, role, email, name bilgilerini al
    req.user = decoded.user || { 
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name
    };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Yetkisiz: geçersiz veya süresi dolmuş token' });
  }
}

// Eski format desteği için de export et
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
