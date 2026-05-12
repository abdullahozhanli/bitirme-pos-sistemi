/**
 * qr-scan.json: onay tiki (Layer 5) kapatılır, komp süresi çerçeve dönüşünden
 * hemen sonraya kısaltılır — loop ile çizgi tekrar baştan okur.
 */
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'görsel', 'qr-scan.json');
const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const NEW_OP = 104;
const TICK_LAYER = 'Layer 5/scan qr.ai';

const layer = j.layers.find((L) => L.nm === TICK_LAYER);
if (layer?.ks) {
  layer.ks.o = { a: 0, k: 0, ix: 11 };
}

j.op = NEW_OP;
for (const L of j.layers) {
  if (typeof L.op === 'number' && L.op > NEW_OP) L.op = NEW_OP;
}

fs.writeFileSync(jsonPath, JSON.stringify(j), 'utf8');
console.log(`Tamam: ${TICK_LAYER} gizlendi, op=${NEW_OP} (~${(NEW_OP / j.fr).toFixed(2)}s)`);
