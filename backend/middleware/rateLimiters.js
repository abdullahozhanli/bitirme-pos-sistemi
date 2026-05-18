const rateLimit = require('express-rate-limit');

const isDevelopment = process.env.NODE_ENV !== 'production';

/** Giriş / kayıt brute-force koruması */
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 40 : 12,
  message: { message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/** Kalori tahmini (AI maliyeti) — giriş yapmış kullanıcı başına */
const calorieEstimateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 25 : 8,
  message: { message: 'Çok fazla kalori tahmini isteği. Lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLoginLimiter,
  calorieEstimateLimiter,
};
