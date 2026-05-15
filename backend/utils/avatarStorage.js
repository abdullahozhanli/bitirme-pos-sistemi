const fs = require('fs');
const path = require('path');

const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');

function ensureAvatarsDir() {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

function isManagedAvatarPath(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return false;
  const s = avatarUrl.trim();
  return s.startsWith('/uploads/avatars/');
}

function avatarFilePathFromUrl(avatarUrl) {
  if (!isManagedAvatarPath(avatarUrl)) return null;
  const name = path.basename(avatarUrl);
  if (!name || name.includes('..')) return null;
  return path.join(AVATARS_DIR, name);
}

function deleteAvatarFileIfManaged(avatarUrl) {
  const filePath = avatarFilePathFromUrl(avatarUrl);
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.warn('deleteAvatarFileIfManaged', e?.message || e);
  }
}

function publicPathForFilename(filename) {
  return `/uploads/avatars/${filename}`;
}

function resolveAvatarUrlForClient(req, avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return '';
  const trimmed = avatarUrl.trim();
  if (!trimmed) return '';
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const publicBase =
    String(process.env.PUBLIC_API_URL || '')
      .trim()
      .replace(/\/+$/, '') ||
    `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
  const rel = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${publicBase}${rel}`;
}

module.exports = {
  AVATARS_DIR,
  ensureAvatarsDir,
  isManagedAvatarPath,
  avatarFilePathFromUrl,
  deleteAvatarFileIfManaged,
  publicPathForFilename,
  resolveAvatarUrlForClient,
};
