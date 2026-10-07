const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const ASSETS_DIR = path.resolve(__dirname, '../assets');
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const ANDROID_RES_DIR = path.resolve(__dirname, '../android/app/src/main/res');

const foregroundPath = path.join(ASSETS_DIR, 'icon-foreground.png');
const iconOnlyPath = path.join(ASSETS_DIR, 'icon-only.png');
const monochromePath = path.join(ASSETS_DIR, 'icon-monochrome.png');

async function run() {
  console.log('🚀 Generating all web, PWA and Android icons from uploaded assets...');

  if (!fs.existsSync(foregroundPath)) {
    throw new Error('Missing assets/icon-foreground.png');
  }

  // Ensure directories exist
  const dirsToEnsure = [
    PUBLIC_DIR,
    path.join(PUBLIC_DIR, 'android'),
    path.join(PUBLIC_DIR, 'ios'),
    path.join(PUBLIC_DIR, 'windows11'),
    path.join(PUBLIC_DIR, 'splash'),
  ];
  for (const d of dirsToEnsure) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  // 1. Copy master splash-logo into /public/splash/
  await sharp(foregroundPath).resize(512, 512).toFile(path.join(PUBLIC_DIR, 'splash', 'splash-logo.png'));
  await sharp(iconOnlyPath).resize(512, 512).toFile(path.join(PUBLIC_DIR, 'splash', 'splash-logo-terracotta.png'));

  // 2. Web & Favicon
  await sharp(foregroundPath).resize(16, 16).toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));
  await sharp(foregroundPath).resize(32, 32).toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  await sharp(foregroundPath).resize(48, 48).toFile(path.join(PUBLIC_DIR, 'favicon.png'));

  // 3. Main logo and store icons
  await sharp(foregroundPath).resize(512, 512).toFile(path.join(PUBLIC_DIR, 'logo.png'));
  await sharp(foregroundPath).resize(512, 512).toFile(path.join(PUBLIC_DIR, 'playstore.png'));
  await sharp(foregroundPath).resize(1024, 1024).toFile(path.join(PUBLIC_DIR, 'appstore.png'));

  // 4. Standard PWA Square Icons
  const pwaSizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];
  for (const size of pwaSizes) {
    await sharp(foregroundPath)
      .resize(size, size)
      .toFile(path.join(PUBLIC_DIR, `icon-${size}.png`));
  }

  // 5. Maskable Icons (padded slightly so circle fits within safe zone)
  for (const size of [192, 512]) {
    const innerSize = Math.round(size * 0.8);
    const padding = Math.round((size - innerSize) / 2);
    const resizedInner = await sharp(foregroundPath)
      .resize(innerSize, innerSize)
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: resizedInner, top: padding, left: padding }])
      .toFile(path.join(PUBLIC_DIR, `icon-maskable-${size}.png`));
  }

  // 6. Apple Touch Icons
  const appleSizes = [120, 152, 167, 180];
  for (const size of appleSizes) {
    await sharp(foregroundPath)
      .resize(size, size)
      .toFile(path.join(PUBLIC_DIR, `apple-touch-icon-${size}x${size}.png`));
  }
  await sharp(foregroundPath).resize(180, 180).toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  // 7. Android subfolder launcher icons
  const androidSizes = [48, 72, 96, 144, 192, 512];
  for (const size of androidSizes) {
    await sharp(foregroundPath)
      .resize(size, size)
      .toFile(path.join(PUBLIC_DIR, 'android', `android-launchericon-${size}-${size}.png`));
  }

  // 8. iOS subfolder icons
  const iosSizes = [16, 20, 29, 32, 40, 50, 57, 58, 60, 64, 72, 76, 80, 87, 100, 114, 120, 128, 144, 152, 167, 180, 192, 512, 1024];
  for (const size of iosSizes) {
    await sharp(foregroundPath)
      .resize(size, size)
      .toFile(path.join(PUBLIC_DIR, 'ios', `${size}.png`));
  }

  // 9. Windows 11 icons
  await sharp(foregroundPath).resize(71, 71).toFile(path.join(PUBLIC_DIR, 'windows11', 'SmallTile.scale-100.png'));
  await sharp(foregroundPath).resize(150, 150).toFile(path.join(PUBLIC_DIR, 'windows11', 'Square150x150Logo.scale-100.png'));
  await sharp(foregroundPath).resize(310, 310).toFile(path.join(PUBLIC_DIR, 'windows11', 'Square310x310Logo.scale-100.png'));
  await sharp(foregroundPath).resize(310, 150, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toFile(path.join(PUBLIC_DIR, 'windows11', 'Wide310x150Logo.scale-100.png'));

  // 10. Native Android Res Mipmap launcher icons
  const androidMipmaps = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const m of androidMipmaps) {
    const targetDir = path.join(ANDROID_RES_DIR, m.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // Square launcher
    await sharp(foregroundPath)
      .resize(m.size, m.size)
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // Round launcher with circular alpha mask
    const circleSvg = Buffer.from(
      `<svg><circle cx="${m.size / 2}" cy="${m.size / 2}" r="${m.size / 2}" fill="#fff" /></svg>`
    );
    await sharp(foregroundPath)
      .resize(m.size, m.size)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // Foreground icon for adaptive icons
    await sharp(foregroundPath)
      .resize(Math.round(m.size * 1.5), Math.round(m.size * 1.5))
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));
  }

  // 11. Native Android Splash screens (clean, high-res centered artwork on warm background)
  const splashConfigs = [
    { dir: 'drawable', w: 480, h: 800 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
  ];

  for (const s of splashConfigs) {
    const splashDir = path.join(ANDROID_RES_DIR, s.dir);
    if (!fs.existsSync(splashDir)) fs.mkdirSync(splashDir, { recursive: true });

    const logoSize = Math.min(Math.round(Math.min(s.w, s.h) * 0.46), 460);
    const resizedLogo = await sharp(foregroundPath)
      .resize(logoSize, logoSize)
      .toBuffer();

    const left = Math.round((s.w - logoSize) / 2);
    const top = Math.round((s.h - logoSize) / 2);

    await sharp({
      create: {
        width: s.w,
        height: s.h,
        channels: 4,
        background: { r: 245, g: 247, b: 250, alpha: 1 },
      },
    })
      .composite([{ input: resizedLogo, left, top }])
      .png()
      .toFile(path.join(splashDir, 'splash.png'));
  }

  // 12. Repack public/pwa-icons.zip
  console.log('📦 Rebuilding public/pwa-icons.zip...');
  try {
    execSync(`cd "${PUBLIC_DIR}" && zip -qr pwa-icons.zip manifest.json apple-touch-icon* icon-* favicon* logo.* playstore.png appstore.png android ios windows11`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('Could not repack pwa-icons.zip:', err.message);
  }

  console.log('✅ ALL ICONS SUCCESSFULLY GENERATED AND REPLACED!');
}

run().catch((e) => {
  console.error('Error updating icons:', e);
  process.exit(1);
});
