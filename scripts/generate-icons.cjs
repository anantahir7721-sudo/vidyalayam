const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = chunk('IHDR', ihdrData);
  const idat = chunk('IDAT', deflated);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function drawVidyalayamIcon(x, y, w, h, isMaskable = false) {
  // Normalize coords to [-1, 1]
  const scale = isMaskable ? 0.72 : 0.88;
  const nx = ((x / w) * 2 - 1) / scale;
  const ny = ((y / h) * 2 - 1) / scale;

  // Background: Rich Terracotta #9d512d to Dark Petrol Slate #141d24 subtle vignette
  const distCenter = Math.sqrt(nx * nx + ny * ny);

  let bgR = 157;
  let bgG = 81;
  let bgB = 45;

  if (isMaskable) {
    // Solid fill for maskable canvas
    bgR = 157;
    bgG = 81;
    bgB = 45;
  } else {
    // Squircle radius check
    const squircle = Math.pow(Math.abs(nx), 3.5) + Math.pow(Math.abs(ny), 3.5);
    if (squircle > 1.0) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
    // Gradient towards bottom right
    const t = (nx + ny + 1.4) / 2.8;
    bgR = Math.round(157 * (1 - 0.2 * t));
    bgG = Math.round(81 * (1 - 0.25 * t));
    bgB = Math.round(45 * (1 + 0.1 * t));
  }

  // Draw Book + Torch Emblem
  // Central golden torch / flame (ny: -0.6 to -0.1, nx: -0.2 to 0.2)
  const torchY = ny - (-0.35);
  const torchDist = Math.sqrt(nx * nx * 2.5 + torchY * torchY * 1.2);
  const isFlame = torchDist < 0.18 && ny < -0.18;

  // Open Book shape at bottom (ny: -0.1 to 0.55)
  // Left page: nx in [-0.55, -0.04], right page: nx in [0.04, 0.55]
  const bookY = ny - 0.22;
  const leftPageDist = Math.abs(bookY + Math.sin(nx * 3.2) * 0.12);
  const rightPageDist = Math.abs(bookY + Math.sin(-nx * 3.2) * 0.12);

  const isLeftPage = nx >= -0.52 && nx <= -0.05 && leftPageDist < 0.22;
  const isRightPage = nx >= 0.05 && nx <= 0.52 && rightPageDist < 0.22;
  const isBookSpine = Math.abs(nx) < 0.05 && ny >= 0.02 && ny <= 0.48;

  // Vidyalayam "V" crest overlay
  const vLeft = Math.abs(ny * 1.5 - nx * 1.8 - 0.2);
  const vRight = Math.abs(ny * 1.5 + nx * 1.8 - 0.2);
  const isVCrest = (vLeft < 0.09 || vRight < 0.09) && ny >= -0.15 && ny <= 0.35 && Math.abs(nx) <= 0.42;

  // Color layers
  if (isFlame) {
    // Warm golden flame #f59c73 / #fbd38d
    return [251, 211, 141, 255];
  }

  if (isVCrest) {
    // Clean bright cream sand #f5f2ec
    return [245, 242, 236, 255];
  }

  if (isLeftPage || isRightPage) {
    // Soft Sand Alabaster #e4ded6
    return [228, 222, 214, 255];
  }

  if (isBookSpine) {
    // Deep Burnt Terracotta
    return [110, 48, 22, 255];
  }

  // Inner border glow
  if (!isMaskable) {
    const squircleInner = Math.pow(Math.abs(nx), 3.5) + Math.pow(Math.abs(ny), 3.5);
    if (squircleInner > 0.88 && squircleInner <= 1.0) {
      return [245, 215, 175, 180]; // Gold rim
    }
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate 192x192
console.log('Generating icon-192.png...');
const icon192 = createPng(192, 192, (x, y, w, h) => drawVidyalayamIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

// 2. Generate 512x512
console.log('Generating icon-512.png...');
const icon512 = createPng(512, 512, (x, y, w, h) => drawVidyalayamIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

// 3. Generate Maskable 512x512
console.log('Generating icon-maskable-512.png...');
const iconMaskable512 = createPng(512, 512, (x, y, w, h) => drawVidyalayamIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), iconMaskable512);

// 4. Generate Apple Touch Icon 180x180
console.log('Generating apple-touch-icon.png...');
const appleIcon = createPng(180, 180, (x, y, w, h) => drawVidyalayamIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// 5. Generate Favicon SVG
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9d512d" />
      <stop offset="100%" stop-color="#202d38" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#grad)" />
  <rect x="24" y="24" width="464" height="464" rx="108" fill="none" stroke="#fbd38d" stroke-width="12" opacity="0.4" />
  <!-- Flame -->
  <path d="M 256 120 C 230 160 216 190 220 220 C 226 250 256 260 256 260 C 256 260 286 250 292 220 C 296 190 282 160 256 120 Z" fill="#fbd38d" />
  <circle cx="256" cy="205" r="16" fill="#f59c73" />
  <!-- Open Book -->
  <path d="M 256 280 C 200 250 140 260 96 280 L 96 390 C 140 370 200 360 256 390 C 312 360 372 370 416 390 L 416 280 C 372 260 312 250 256 280 Z" fill="#e4ded6" />
  <path d="M 256 280 L 256 390" stroke="#9d512d" stroke-width="8" stroke-linecap="round" />
  <!-- Graduation V Crest -->
  <path d="M 170 330 L 256 420 L 342 330" fill="none" stroke="#9d512d" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

console.log('All icons generated successfully!');
