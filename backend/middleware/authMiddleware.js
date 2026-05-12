const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getTokenFromHeaders(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  const legacy = req.headers['x-auth-token'];
  if (legacy != null && String(legacy).trim()) return String(legacy).trim();
  return null;
}

async function authMiddleware(req, res, next) {
  try {
    const token = getTokenFromHeaders(req);
    if (!token) return res.status(401).json({ message: 'Yetkisiz: token yok' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.id || decoded?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Yetkisiz: geçersiz token içeriği' });
    }

    const user = await User.findById(userId).select('_id role email branchId isActive').lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Yetkisiz: geçersiz kullanıcı' });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      branchId: user.branchId ? user.branchId.toString() : null,
    };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Yetkisiz: geçersiz veya süresi dolmuş token' });
  }
}

/** Token yoksa veya geçersizse devam eder; varsa req.user doldurur */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = getTokenFromHeaders(req);
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.id || decoded?.user?.id;
    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(userId).select('_id role email branchId isActive').lean();
    if (!user || !user.isActive) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      branchId: user.branchId ? user.branchId.toString() : null,
    };
    next();
  } catch (e) {
    req.user = null;
    next();
  }
}

// Eski format desteği için de export et
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuthMiddleware = optionalAuthMiddleware;
