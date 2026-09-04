const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'frontend', 'dist');
const androidAssetsDir = path.join(rootDir, 'frontend', 'android', 'app', 'src', 'main', 'assets', 'public');
const configSrc = path.join(rootDir, 'frontend', 'capacitor.config.json');
const configDest = path.join(rootDir, 'frontend', 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json');

console.log('🔄 [Mobile Sync] Starting Capacitor Android asset synchronization...');

if (!fs.existsSync(distDir)) {
  console.error('❌ [Mobile Sync] frontend/dist directory not found! Please run production build first.');
  process.exit(1);
}

// Ensure target directory exists
fs.mkdirSync(androidAssetsDir, { recursive: true });

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Clean and copy dist to android assets
console.log(`📦 Copying web bundle from ${distDir} to ${androidAssetsDir}...`);
copyRecursive(distDir, androidAssetsDir);

if (fs.existsSync(configSrc)) {
  fs.copyFileSync(configSrc, configDest);
}

console.log('✅ [Mobile Sync] Capacitor Android assets synchronized successfully!');
