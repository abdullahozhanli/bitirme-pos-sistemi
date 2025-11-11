module.exports = function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Giriş yapmalısın' });
    }

    // Debug: req.user ve role bilgisini logla
    console.log('🔍 requireRole check:', {
      userEmail: req.user.email,
      userRole: req.user.role,
      userRoleType: typeof req.user.role,
      allowedRoles: allowedRoles,
      hasAccess: allowedRoles.includes(req.user.role)
    });

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Bu işlem için yetkin yok',
        debug: {
          userRole: req.user.role,
          allowedRoles: allowedRoles
        }
      });
    }

    next();
  };
};
