const rateLimit = require('express-rate-limit');

/**
 * Genel rate limiter (tüm endpoint'ler için)
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // Her IP için 15 dakikada maksimum 100 istek
  message: {
    message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
  },
  standardHeaders: true, // Rate limit bilgilerini `RateLimit-*` header'larında döndür
  legacyHeaders: false, // `X-RateLimit-*` header'larını devre dışı bırak
});

/**
 * Login endpoint için rate limiter (daha sıkı)
 * Brute force saldırılarını önlemek için
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // Her IP için 15 dakikada maksimum 5 login denemesi
  message: {
    message: 'Çok fazla giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Tüm istekleri say (başarılı ve başarısız)
  // IP adresini doğru algılamak için (proxy/load balancer arkasında)
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
});

/**
 * Register endpoint için rate limiter
 * Spam kayıtları önlemek için
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // Her IP için 1 saatte maksimum 3 kayıt
  message: {
    message: 'Çok fazla kayıt denemesi yapıldı. Lütfen 1 saat sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Setup-first-admin endpoint için rate limiter (çok sıkı)
 * İlk admin oluşturma saldırılarını önlemek için
 */
const setupFirstAdminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // Her IP için 1 saatte maksimum 3 deneme
  message: {
    message: 'Çok fazla deneme yapıldı. Lütfen 1 saat sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  setupFirstAdminLimiter,
};

