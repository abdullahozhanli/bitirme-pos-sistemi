const sharp = require('sharp');
const path = require('path');

const dir = path.join(__dirname, '../src/görsel/odeme');
const size = { width: 720, height: 440 };

async function main() {
  await sharp({
    create: { ...size, channels: 3, background: { r: 248, g: 245, b: 239 } },
  })
    .png()
    .toFile(path.join(dir, 'kart_on.png'));

  const stripe = Buffer.from(
    '<svg width="720" height="440"><rect width="720" height="72" y="88" fill="#2c2c2c"/></svg>'
  );
  await sharp({
    create: { ...size, channels: 3, background: { r: 240, g: 237, b: 232 } },
  })
    .composite([{ input: stripe, top: 0, left: 0 }])
    .png()
    .toFile(path.join(dir, 'kart_arka.png'));

  console.log('Created kart_on.png and kart_arka.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
