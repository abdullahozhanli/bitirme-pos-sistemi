/**
 * Middleware: Sadece superadmin rolüne izin verir
 */
module.exports = function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Giriş yapmalısın' });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      message: 'Bu işlem için süper admin yetkisi gereklidir',
      debug: {
        userRole: req.user.role
      }
    });
  }

  next();
};









