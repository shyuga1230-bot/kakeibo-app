// Generates PWA icons as pure PNG using only Node.js built-ins (no extra deps needed).
// Design: indigo (#4F46E5) background, white coin circle, indigo ¥ symbol.
// Run: node scripts/generate-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ────────────────────────────────────────────────────────────────────
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
function createIconPNG(size) {
  const img = new Uint8Array(size * size * 4);

  // Helper: set RGBA pixel
  const set = (x, y, r, g, b) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    img[i] = r; img[i + 1] = g; img[i + 2] = b; img[i + 3] = 255;
  };

  // 1. Fill indigo background (#4F46E5 = 79,70,229)
  for (let i = 0; i < size * size; i++) {
    img[i * 4] = 79; img[i * 4 + 1] = 70; img[i * 4 + 2] = 229; img[i * 4 + 3] = 255;
  }

  const cx = size / 2, cy = size / 2;

  // 2. White coin circle
  const coinR = size * 0.36;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= coinR ** 2)
        set(x, y, 255, 255, 255);

  // 3. Draw ¥ symbol in indigo inside the coin
  const s = size / 192;

  // Filled rectangle (relative to center)
  function fillRect(rx, ry, w, h) {
    for (let dy = 0; dy < Math.ceil(h); dy++)
      for (let dx = 0; dx < Math.ceil(w); dx++)
        set(cx + rx + dx, cy + ry + dy, 79, 70, 229);
  }

  // Thick anti-aliased line (relative to center)
  function thickLine(x1, y1, x2, y2, thick) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const r = thick / 2;
    const pad = r + 1;
    for (let y = Math.floor(Math.min(y1, y2) - pad); y <= Math.ceil(Math.max(y1, y2) + pad); y++) {
      for (let x = Math.floor(Math.min(x1, x2) - pad); x <= Math.ceil(Math.max(x1, x2) + pad); x++) {
        const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2)) : 0;
        const dist = Math.sqrt((x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2);
        if (dist <= r) set(cx + x, cy + y, 79, 70, 229);
      }
    }
  }

  // ¥ design (all coords relative to icon center, normalized to 192px)
  const thick = 9 * s;
  const armW  = 33 * s;   // horizontal spread of Y arms
  const top   = -40 * s;  // top of Y arms
  const junc  = -8  * s;  // Y junction
  const bot   = 36  * s;  // bottom of stem
  const bar1Y = 5   * s;  // first bar center
  const bar2Y = 17  * s;  // second bar center
  const barHW = 27  * s;  // bar half-width
  const barH  = 6.5 * s;  // bar height

  thickLine(-armW, top, 0, junc, thick);      // left arm
  thickLine( armW, top, 0, junc, thick);      // right arm
  thickLine(0, junc, 0, bot, thick);          // stem
  fillRect(-barHW, bar1Y - barH / 2, barHW * 2, barH);  // bar 1
  fillRect(-barHW, bar2Y - barH / 2, barHW * 2, barH);  // bar 2

  // 4. Convert RGBA → RGB rows with PNG filter bytes
  const stride = size * 3 + 1;
  const raw = Buffer.allocUnsafe(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * stride + 1 + x * 3;
      raw[dst] = img[src]; raw[dst + 1] = img[src + 1]; raw[dst + 2] = img[src + 2];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Output ───────────────────────────────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public');
const icons = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];
for (const [name, size] of icons) {
  fs.writeFileSync(path.join(publicDir, name), createIconPNG(size));
  console.log(`✓ ${name} (${size}×${size})`);
}
