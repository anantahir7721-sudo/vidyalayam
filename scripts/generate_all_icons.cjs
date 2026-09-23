const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// 1. Standard Logo SVG with warm parchment canvas and typography
const masterSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient (Warm Parchment/Linen) -->
    <radialGradient id="bg-grad" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#fbf7f0" />
      <stop offset="65%" stop-color="#f0e2cf" />
      <stop offset="100%" stop-color="#e5d2bc" />
    </radialGradient>
    
    <!-- Papercraft Drop Shadows -->
    <filter id="shadow-deep" x="-15%" y="-15%" width="130%" height="135%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#4a2612" flood-opacity="0.25" />
    </filter>
    <filter id="shadow-book" x="-15%" y="-15%" width="130%" height="135%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#3b1d0c" flood-opacity="0.32" />
    </filter>
    <filter id="shadow-roof" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#331808" flood-opacity="0.28" />
    </filter>
  </defs>

  <!-- Background Base Canvas -->
  <rect width="512" height="512" rx="100" fill="url(#bg-grad)" />

  <!-- EMBLEM GROUP (Centered vertically and horizontally) -->
  <g id="school-emblem" transform="translate(0, -18)">
    <!-- 1. OPEN BOOK LAYERS (Base) -->
    <!-- Bottom Cover (Deep Terracotta / Saddle Brown) -->
    <path d="M 90 286 C 160 262 216 270 256 324 C 296 270 352 262 422 286 C 427 296 422 306 418 312 C 350 282 296 288 256 348 C 216 288 162 282 94 312 C 90 306 85 296 90 286 Z"
          fill="#843e1b" filter="url(#shadow-book)" />

    <!-- Book Bottom Trim / Spines -->
    <path d="M 94 306 C 162 278 216 284 256 342 C 296 284 350 278 418 306 L 416 314 C 350 286 296 292 256 352 C 216 292 162 286 96 314 Z"
          fill="#5a260e" />

    <!-- Middle Page Layer (Warm Ochre / Tan Paper) -->
    <path d="M 94 280 C 164 254 218 262 256 318 C 294 262 348 254 418 280 L 414 298 C 348 272 296 278 256 336 C 216 278 164 272 98 298 Z"
          fill="#d88443" />

    <!-- Top Open Pages (Warm Cream / Ivory Paper with 3D curve) -->
    <path d="M 112 248 C 172 244 220 254 256 288 C 292 254 340 244 400 248 L 410 274 C 344 254 296 268 256 322 C 216 268 168 254 102 274 Z"
          fill="#fbf7f0" filter="url(#shadow-deep)" />

    <!-- Book Spine / Valley Stitch -->
    <path d="M 256 288 L 256 338" stroke="#a0522d" stroke-width="3" stroke-linecap="round" />

    <!-- 2. SCHOOL BUILDING STRUCTURE -->
    <!-- Building Walls (Warm Linen / Off-White Cardstock) -->
    <rect x="146" y="196" width="60" height="64" fill="#ede1d0" />
    <rect x="306" y="196" width="60" height="64" fill="#ede1d0" />
    
    <!-- Central Tower Wall -->
    <rect x="200" y="146" width="112" height="126" fill="#f5ebe0" />
    <polygon points="200,146 256,104 312,146" fill="#f5ebe0" />

    <!-- 3. ROOFS (Warm Terracotta / Cedar Shingle Papercraft) -->
    <!-- Central Triangular Gable Roof -->
    <polygon points="256,92 324,146 314,152 256,108 198,152 188,146"
            fill="#662f17" />
    <polygon points="256,96 320,146 312,152 256,110 200,152 192,146"
            fill="#8c4423" filter="url(#shadow-roof)" />

    <!-- Left Wing Sloping Roof -->
    <polygon points="134,204 204,166 208,174 142,210" fill="#662f17" />
    <polygon points="136,204 204,168 206,174 142,208" fill="#8c4423" />

    <!-- Right Wing Sloping Roof -->
    <polygon points="378,204 308,166 304,174 370,210" fill="#662f17" />
    <polygon points="376,204 308,168 306,174 370,208" fill="#8c4423" />

    <!-- 4. TOP FLAGPOLE & BANNER FLAG -->
    <!-- Pole -->
    <rect x="254" y="68" width="4" height="28" rx="1.5" fill="#54240f" />
    <!-- Pennant Flag (Flying to the right) -->
    <path d="M 258 70 C 274 68 284 76 294 72 L 294 88 C 284 84 274 92 258 86 Z"
          fill="#662f17" />

    <!-- 5. ARCHED WINDOWS (Left & Right Wings) -->
    <!-- Left Wing Windows (2 Arched Windows) -->
    <path d="M 160 232 L 160 215 C 160 210 164 206 169 206 C 174 206 178 210 178 215 L 178 232 Z" fill="#633119" />
    <path d="M 184 232 L 184 215 C 184 210 188 206 193 206 C 198 206 202 210 202 215 L 202 232 Z" fill="#633119" />

    <!-- Right Wing Windows (2 Arched Windows) -->
    <path d="M 310 232 L 310 215 C 310 210 314 206 319 206 C 324 206 328 210 328 215 L 328 232 Z" fill="#633119" />
    <path d="M 334 232 L 334 215 C 334 210 338 206 343 206 C 348 206 352 210 352 215 L 352 232 Z" fill="#633119" />

    <!-- 6. CENTRAL SUN MOTIF / CLOCK & ENTRYWAY -->
    <circle cx="256" cy="154" r="16" fill="#c4622b" />
    
    <!-- 8 Sun Rays around the circle -->
    <rect x="254" y="130" width="4" height="6" rx="2" fill="#8c4423" />
    <rect x="254" y="172" width="4" height="6" rx="2" fill="#8c4423" />
    <rect x="232" y="152" width="6" height="4" rx="2" fill="#8c4423" />
    <rect x="274" y="152" width="6" height="4" rx="2" fill="#8c4423" />
    <rect x="239" y="138" width="5.5" height="3.5" rx="1.5" fill="#8c4423" transform="rotate(45 241.7 139.7)" />
    <rect x="268" y="167" width="5.5" height="3.5" rx="1.5" fill="#8c4423" transform="rotate(45 270.7 168.7)" />
    <rect x="268" y="138" width="5.5" height="3.5" rx="1.5" fill="#8c4423" transform="rotate(-45 270.7 139.7)" />
    <rect x="239" y="167" width="5.5" height="3.5" rx="1.5" fill="#8c4423" transform="rotate(-45 241.7 168.7)" />

    <!-- Lintel Bar above door -->
    <rect x="244" y="186" width="24" height="5" rx="2" fill="#662f17" />

    <!-- Central Grand Arched Entry Door -->
    <path d="M 240 252 L 240 210 C 240 200 248 194 256 194 C 264 194 272 200 272 210 L 272 252 Z"
          fill="#54240f" />
  </g>

  <!-- 7. TYPOGRAPHY "Vidyalayam" & "by NRChad" -->
  <text x="256" y="394"
        text-anchor="middle"
        font-family="Liberation Serif, Georgia, serif"
        font-size="44"
        font-weight="bold"
        letter-spacing="0.5"
        fill="#3b1d0c">Vidyalayam</text>

  <text x="256" y="432"
        text-anchor="middle"
        font-family="Liberation Sans, sans-serif"
        font-size="24"
        font-weight="bold"
        letter-spacing="0.8"
        fill="#9d512d">by NRChad</text>
</svg>
`;

// 2. Full-bleed Maskable SVG for Android Adaptive Icons (centered at 75% inside safe zone)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg-grad-mask" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#fbf7f0" />
      <stop offset="65%" stop-color="#f0e2cf" />
      <stop offset="100%" stop-color="#e5d2bc" />
    </radialGradient>
    <filter id="shadow-deep-m" x="-15%" y="-15%" width="130%" height="135%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#4a2612" flood-opacity="0.25" />
    </filter>
    <filter id="shadow-book-m" x="-15%" y="-15%" width="130%" height="135%">
      <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#3b1d0c" flood-opacity="0.32" />
    </filter>
    <filter id="shadow-roof-m" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#331808" flood-opacity="0.28" />
    </filter>
  </defs>

  <!-- Full bleed without rx -->
  <rect width="512" height="512" fill="url(#bg-grad-mask)" />

  <!-- Center group scaled down to fit circular/squircle maskable safe zone (72%) -->
  <g transform="translate(72, 72) scale(0.72)">
    <g id="school-emblem-m" transform="translate(0, -18)">
      <path d="M 90 286 C 160 262 216 270 256 324 C 296 270 352 262 422 286 C 427 296 422 306 418 312 C 350 282 296 288 256 348 C 216 288 162 282 94 312 C 90 306 85 296 90 286 Z"
            fill="#843e1b" filter="url(#shadow-book-m)" />
      <path d="M 94 306 C 162 278 216 284 256 342 C 296 284 350 278 418 306 L 416 314 C 350 286 296 292 256 352 C 216 292 162 286 96 314 Z"
            fill="#5a260e" />
      <path d="M 94 280 C 164 254 218 262 256 318 C 294 262 348 254 418 280 L 414 298 C 348 272 296 278 256 336 C 216 278 164 272 98 298 Z"
          fill="#d88443" />
      <path d="M 112 248 C 172 244 220 254 256 288 C 292 254 340 244 400 248 L 410 274 C 344 254 296 268 256 322 C 216 268 168 254 102 274 Z"
            fill="#fbf7f0" filter="url(#shadow-deep-m)" />
      <path d="M 256 288 L 256 338" stroke="#a0522d" stroke-width="3" stroke-linecap="round" />
      <rect x="146" y="196" width="60" height="64" fill="#ede1d0" />
      <rect x="306" y="196" width="60" height="64" fill="#ede1d0" />
      <rect x="200" y="146" width="112" height="126" fill="#f5ebe0" />
      <polygon points="200,146 256,104 312,146" fill="#f5ebe0" />
      <polygon points="256,92 324,146 314,152 256,108 198,152 188,146" fill="#662f17" />
      <polygon points="256,96 320,146 312,152 256,110 200,152 192,146" fill="#8c4423" filter="url(#shadow-roof-m)" />
      <polygon points="134,204 204,166 208,174 142,210" fill="#662f17" />
      <polygon points="136,204 204,168 206,174 142,208" fill="#8c4423" />
      <polygon points="378,204 308,166 304,174 370,210" fill="#662f17" />
      <polygon points="376,204 308,168 306,174 370,208" fill="#8c4423" />
      <rect x="254" y="68" width="4" height="28" rx="1.5" fill="#54240f" />
      <path d="M 258 70 C 274 68 284 76 294 72 L 294 88 C 284 84 274 92 258 86 Z" fill="#662f17" />
      <path d="M 160 232 L 160 215 C 160 210 164 206 169 206 C 174 206 178 210 178 215 L 178 232 Z" fill="#633119" />
      <path d="M 184 232 L 184 215 C 184 210 188 206 193 206 C 198 206 202 210 202 215 L 202 232 Z" fill="#633119" />
      <path d="M 310 232 L 310 215 C 310 210 314 206 319 206 C 324 206 328 210 328 215 L 328 232 Z" fill="#633119" />
      <path d="M 334 232 L 334 215 C 334 210 338 206 343 206 C 348 206 352 210 352 215 L 352 232 Z" fill="#633119" />
      <circle cx="256" cy="154" r="16" fill="#c4622b" />
      <rect x="254" y="130" width="4" height="6" rx="2" fill="#8c4423" />
      <rect x="254" y="172" width="4" height="6" rx="2" fill="#8c4423" />
      <rect x="232" y="152" width="6" height="4" rx="2" fill="#8c4423" />
      <rect x="274" y="152" width="6" height="4" rx="2" fill="#8c4423" />
      <rect x="239" y="138" width="5.5" height="3.5" rx="1.5" fill="#8c4423" transform="rotate(45 241.7 139.7)" />
      <rect x="268" y="167" width="5.5" height="3.5" rx="1.5" fill="#8c4423" transform="rotate(45 270.7 168.7)" />
      <rect x="268" y="138" width="5.5" height="3.5" rx="1.5" fill="#8c4423" transform="rotate(-45 270.7 139.7)" />
      <rect x="239" y="167" width="5.5" height="3.5" rx="1.5" fill="#8c4423" transform="rotate(-45 241.7 168.7)" />
      <rect x="244" y="186" width="24" height="5" rx="2" fill="#662f17" />
      <path d="M 240 252 L 240 210 C 240 200 248 194 256 194 C 264 194 272 200 272 210 L 272 252 Z" fill="#54240f" />
    </g>
    <text x="256" y="394" text-anchor="middle" font-family="Liberation Serif, Georgia, serif" font-size="44" font-weight="bold" letter-spacing="0.5" fill="#3b1d0c">Vidyalayam</text>
    <text x="256" y="432" text-anchor="middle" font-family="Liberation Sans, sans-serif" font-size="24" font-weight="bold" letter-spacing="0.8" fill="#9d512d">by NRChad</text>
  </g>
</svg>
`;

fs.writeFileSync('public/logo.svg', masterSvg.trim());
fs.writeFileSync('public/favicon.svg', masterSvg.trim());

function render(svgStr, width, height) {
  const r = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles: [
        '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
      ],
      loadSystemFonts: true
    }
  });
  return r.render().asPng();
}

const icons = [
  { path: 'public/favicon-16x16.png', size: 16 },
  { path: 'public/favicon-32x32.png', size: 32 },
  { path: 'public/favicon.png', size: 48 },
  { path: 'public/icon-48.png', size: 48 },
  { path: 'public/icon-72.png', size: 72 },
  { path: 'public/icon-96.png', size: 96 },
  { path: 'public/icon-128.png', size: 128 },
  { path: 'public/icon-144.png', size: 144 },
  { path: 'public/icon-152.png', size: 152 },
  { path: 'public/icon-192.png', size: 192 },
  { path: 'public/icon-384.png', size: 384 },
  { path: 'public/icon-512.png', size: 512 },
  { path: 'public/logo.png', size: 512 },
  { path: 'public/appstore.png', size: 1024 },
  { path: 'public/playstore.png', size: 512 },
  { path: 'public/apple-touch-icon.png', size: 180 },
  { path: 'public/apple-touch-icon-120x120.png', size: 120 },
  { path: 'public/apple-touch-icon-152x152.png', size: 152 },
  { path: 'public/apple-touch-icon-167x167.png', size: 167 },
  { path: 'public/apple-touch-icon-180x180.png', size: 180 },
  { path: 'public/android/android-launchericon-48-48.png', size: 48 },
  { path: 'public/android/android-launchericon-72-72.png', size: 72 },
  { path: 'public/android/android-launchericon-96-96.png', size: 96 },
  { path: 'public/android/android-launchericon-144-144.png', size: 144 },
  { path: 'public/android/android-launchericon-192-192.png', size: 192 },
  { path: 'public/android/android-launchericon-512-512.png', size: 512 },
  { path: 'public/windows11/SmallTile.scale-100.png', size: 71 },
  { path: 'public/windows11/Square150x150Logo.scale-100.png', size: 150 },
  { path: 'public/windows11/Square310x310Logo.scale-100.png', size: 310 },
  { path: 'public/windows11/Wide310x150Logo.scale-100.png', size: 310 }
];

const iosSizes = [16, 20, 29, 32, 40, 50, 57, 58, 60, 64, 72, 76, 80, 87, 100, 114, 120, 128, 144, 152, 167, 180, 192, 512, 1024];
iosSizes.forEach(s => {
  icons.push({ path: `public/ios/${s}.png`, size: s });
});

icons.forEach(item => {
  try {
    const dir = path.dirname(item.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(item.path, render(masterSvg, item.size, item.size));
  } catch (e) {
    console.error('Error writing ' + item.path, e);
  }
});
console.log('Standard icons written:', icons.length);

const maskables = [
  { path: 'public/icon-maskable-192.png', size: 192 },
  { path: 'public/icon-maskable-512.png', size: 512 }
];

maskables.forEach(item => {
  fs.writeFileSync(item.path, render(maskableSvg, item.size, item.size));
});
console.log('Maskable icons written:', maskables.length);
