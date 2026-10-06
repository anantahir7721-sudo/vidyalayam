#!/usr/bin/env node
/**
 * Script to unpack a custom splash animation zip into /public/splash/
 * Usage: node scripts/install-splash-zip.cjs [path-to-zip]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.resolve(__dirname, '../public/splash');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const inputZip = process.argv[2] || 'splash.zip';
const possibleZips = [
  inputZip,
  path.resolve(__dirname, '../splash.zip'),
  path.resolve(__dirname, '../public/splash.zip'),
  path.resolve(__dirname, '../public/splash/splash.zip'),
];

let foundZip = null;
for (const p of possibleZips) {
  if (fs.existsSync(p)) {
    foundZip = p;
    break;
  }
}

if (!foundZip) {
  console.log(`ℹ️ Place your splash animation zip as 'splash.zip' in the root or pass the path: node scripts/install-splash-zip.cjs <path>`);
  process.exit(0);
}

try {
  console.log(`📦 Unpacking splash animation from: ${foundZip}...`);
  execSync(`unzip -o "${foundZip}" -d "${targetDir}"`, { stdio: 'inherit' });
  console.log(`✅ Custom splash animation successfully installed in public/splash/`);
} catch (e) {
  console.error(`❌ Error extracting splash zip:`, e.message);
}
