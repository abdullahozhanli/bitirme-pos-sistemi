/**
 * Middleware: Kullanıcının branch'ine göre veri filtreleme yapar
 * Süper admin'ler tüm branch'leri görebilir
 * Diğer kullanıcılar sadece kendi branch'lerini görebilir
 */
module.exports = function branchAccess(req, res, next) {
  // Süper admin ise tüm branch'lere erişebilir
  if (req.user && req.user.role === 'superadmin') {
    req.branchFilter = {}; // Tüm branch'ler
    return next();
  }

  // Kullanıcının branchId'si varsa sadece o branch'i göster
  if (req.user && req.user.branchId) {
    req.branchFilter = { branchId: req.user.branchId };
  } else {
    // BranchId yoksa erişim yok (süper admin değilse)
    req.branchFilter = { branchId: null }; // Hiçbir veri gösterilmez
  }

  next();
};









