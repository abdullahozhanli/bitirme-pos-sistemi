const path = require('path');
const multer = require('multer');
const { AVATARS_DIR, ensureAvatarsDir } = require('../utils/avatarStorage');

ensureAvatarsDir();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureAvatarsDir();
    cb(null, AVATARS_DIR);
  },
  filename(req, file, cb) {
    const userId = String(req.user?.id || req.user?._id || 'user');
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `${userId}-${Date.now()}${safeExt === '.jpeg' ? '.jpg' : safeExt}`);
  },
});

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype || '');
    cb(ok ? null : new Error('JPEG, PNG veya WebP yükleyin.'), ok);
  },
});

module.exports = { uploadAvatar };
