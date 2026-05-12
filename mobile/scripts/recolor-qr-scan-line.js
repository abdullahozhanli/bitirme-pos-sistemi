/**
 * qr-scan.json içindeki image_3 (ince tarama şeridi) PNG'sini
 * açık ama doygun yeşile boyar (üstte hafif highlight = vurgu).
 * Kullanım: mobile klasöründe `node scripts/recolor-qr-scan-line.js`
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('sharp yüklü değil. Çalıştır: npm install sharp --save-dev');
  process.exit(1);
}

/** Ana ton: açık, canlı yeşil */
const GREEN = { r: 0x5a, g: 0xdb, b: 0x72 }; // #5ADB72
/** Üst kenara doğru biraz daha açık (ışık vurgusu) */
const GREEN_HI = { r: 0x72, g: 0xee, b: 0x8c }; // #72EE8C

function shouldRecolor(r, g, b, a) {
  if (a < 28) return false;
  if (r > 248 && g > 248 && b > 248) return false;
  // güçlü mavi
  if (b > r + 22 && b > g + 22) return true;
  // sarı / altın
  if (r > 185 && g > 165 && b < 210) return true;
  // cyan
  if (g > 170 && b > 170 && r < 200) return true;
  // önceki koyu / orta yeşil çizgi (#3FA34D vb.)
  if (g > r + 15 && g > b + 10 && r < 140 && b < 130) return true;
  return false;
}

function lerpByte(a, b, t) {
  return Math.round(a + (b - a) * t);
}

(async () => {
  const jsonPath = path.join(__dirname, '..', 'src', 'görsel', 'qr-scan.json');
  const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const asset = j.assets.find((a) => a.id === 'image_3');
  if (!asset?.p?.startsWith('data:image/png;base64,')) {
    console.error('image_3 bulunamadı');
    process.exit(1);
  }
  const buf = Buffer.from(asset.p.split(',')[1], 'base64');
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const h = info.height;
  for (let y = 0; y < h; y++) {
    const row = y * info.width * ch;
    const v = h <= 1 ? 0 : y / (h - 1);
    const tHi = 1 - v;
    const rr = lerpByte(GREEN.r, GREEN_HI.r, tHi * 0.55);
    const gg = lerpByte(GREEN.g, GREEN_HI.g, tHi * 0.55);
    const bb = lerpByte(GREEN.b, GREEN_HI.b, tHi * 0.55);
    for (let x = 0; x < info.width; x++) {
      const i = row + x * ch;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (shouldRecolor(r, g, b, a)) {
        data[i] = rr;
        data[i + 1] = gg;
        data[i + 2] = bb;
      }
    }
  }
  const out = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .png()
    .toBuffer();
  asset.p = `data:image/png;base64,${out.toString('base64')}`;
  fs.writeFileSync(jsonPath, JSON.stringify(j), 'utf8');
  console.log('Tamam: image_3 açık vurgulu yeşile güncellendi (#5ADB72 → #72EE8C üst highlight).');
})();
