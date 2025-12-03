const { body, validationResult } = require('express-validator');

/**
 * Validation hatalarını handle eden middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Geçersiz veri',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Login validation rules
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('E-posta adresi gereklidir')
    .isEmail().withMessage('Geçerli bir e-posta adresi girin')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('E-posta adresi çok uzun'),
  
  body('password')
    .notEmpty().withMessage('Şifre gereklidir')
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
    .isLength({ max: 128 }).withMessage('Şifre çok uzun'),
  
  handleValidationErrors
];

/**
 * Register validation rules
 */
const validateRegister = [
  body('email')
    .trim()
    .notEmpty().withMessage('E-posta adresi gereklidir')
    .isEmail().withMessage('Geçerli bir e-posta adresi girin')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('E-posta adresi çok uzun'),
  
  body('password')
    .notEmpty().withMessage('Şifre gereklidir')
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
    .isLength({ max: 128 }).withMessage('Şifre çok uzun'),
    // Not: Şifre karmaşıklığı kontrolü opsiyonel - production'da daha sıkı olabilir
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('İsim 2-100 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/).withMessage('İsim sadece harf içerebilir')
    .optional(),
  
  body('role')
    .optional()
    .isIn(['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'])
    .withMessage('Geçersiz rol'),
  
  handleValidationErrors
];

/**
 * Setup-first-admin validation rules (daha basit, çünkü sadece ilk kurulum için)
 */
const validateSetupFirstAdmin = [
  body('email')
    .trim()
    .notEmpty().withMessage('E-posta adresi gereklidir')
    .isEmail().withMessage('Geçerli bir e-posta adresi girin')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('E-posta adresi çok uzun'),
  
  body('password')
    .notEmpty().withMessage('Şifre gereklidir')
    .isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
    .isLength({ max: 128 }).withMessage('Şifre çok uzun'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('İsim 2-100 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/).withMessage('İsim sadece harf içerebilir')
    .optional(),
  
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateRegister,
  validateSetupFirstAdmin,
  handleValidationErrors,
};

