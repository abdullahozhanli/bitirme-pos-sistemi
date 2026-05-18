const WEAK_JWT_SECRETS = new Set([
  'supersecretkey123456789changeinproduction',
  'secret',
  'jwt_secret',
  'changeme',
]);

function warnInsecureJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('⚠️  JWT_SECRET tanımlı değil — auth çalışmaz.');
    return;
  }
  if (secret.length < 32 || WEAK_JWT_SECRETS.has(secret)) {
    const msg =
      'JWT_SECRET zayıf veya çok kısa. Production için en az 32 karakter rastgele bir değer kullanın.';
    if (process.env.NODE_ENV === 'production') {
      console.error(`❌ ${msg}`);
    } else {
      console.warn(`⚠️  ${msg}`);
    }
  }
}

module.exports = { warnInsecureJwtSecret };
