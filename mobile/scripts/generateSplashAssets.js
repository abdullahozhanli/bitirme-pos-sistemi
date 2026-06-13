/**
 * Self Kasa splash ve adaptive icon görsellerini mevcut logodan üretir.
 * Kullanım: node scripts/generateSplashAssets.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const LOGO = path.join(ROOT, 'src', 'görsel', 'logo.png');
const OUT_DIR = path.join(ROOT, 'assets');
const BG = '#F8F7F5';

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function buildAdaptiveIcon() {
  const size = 1024;
  const logoWidth = Math.round(size * 0.72);
  const logo = await sharp(LOGO).resize({ width: logoWidth }).png().toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.round((size - meta.width) / 2);
  const top = Math.round((size - meta.height) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(path.join(OUT_DIR, 'adaptive-icon.png'));
}

async function buildSplashIcon() {
  const canvas = 900;
  const logoWidth = 620;
  const logo = await sharp(LOGO).resize({ width: logoWidth }).png().toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.round((canvas - meta.width) / 2);
  const top = Math.round((canvas - meta.height) / 2);

  await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(path.join(OUT_DIR, 'splash-icon.png'));
}

async function buildFullSplash() {
  const width = 1284;
  const height = 2778;
  const logoWidth = 760;
  const logo = await sharp(LOGO).resize({ width: logoWidth }).png().toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.round((width - meta.width) / 2);
  const top = Math.round((height - meta.height) / 2) - 80;

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(path.join(OUT_DIR, 'splash.png'));
}

async function main() {
  if (!fs.existsSync(LOGO)) {
    console.error('Logo bulunamadı:', LOGO);
    process.exit(1);
  }

  await ensureDir(OUT_DIR);
  await buildAdaptiveIcon();
  await buildSplashIcon();
  await buildFullSplash();
  console.log('Splash assetleri oluşturuldu:', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
