const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'frontend', 'android');
const releaseDir = path.join(rootDir, 'release', 'mobile');

console.log('📱 ========================================================');
console.log('📱   Z-Systems ERP — Google Play AAB Bundle Build Engine  ');
console.log('📱 ========================================================');

// 1. Sync web assets to Android
try {
  require('./sync-capacitor-android.cjs');
} catch (e) {
  console.error('❌ Failed to synchronize Android assets:', e);
  process.exit(1);
}

// 2. Check Java Availability
let hasJava = false;
try {
  execSync('java -version', { stdio: 'ignore' });
  hasJava = true;
} catch {
  hasJava = false;
}

if (!hasJava) {
  console.log('\n⚠️  تنبيه بيئة الأندرويد المحلية:');
  console.log('   لم يتم العثور على حزمة جافا (Java JDK) في مسار النظام (PATH).');
  console.log('   تم تجهيز ومزامنة مشروع الأندرويد بالكامل في:');
  console.log(`   📂 ${androidDir}`);
  console.log('\n📱 يمكنك توليد حزمة Google Play (AAB) عبر Android Studio:');
  console.log('   1. فتح المجلد "frontend/android" في Android Studio.');
  console.log('   2. Build > Generate Signed Bundle / APK > Android App Bundle.');
  process.exit(0);
}

// 3. Build AAB via Gradle
console.log('\n☕ Java detected. Building Android App Bundle (AAB) for Google Play Store...');
fs.mkdirSync(releaseDir, { recursive: true });

try {
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';
  const gradlewPath = path.join(androidDir, gradlewCmd);

  if (fs.existsSync(gradlewPath)) {
    console.log(`🚀 Executing ${gradlewCmd} bundleRelease...`);
    execSync(`${gradlewCmd} bundleRelease`, { cwd: androidDir, stdio: 'inherit' });

    const generatedAab = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'frontend', 'package.json'), 'utf8'));
    const version = pkg.version || '1.1.31';
    const targetAab = path.join(releaseDir, `ZSystems-ERP-v${version}-store-release.aab`);

    if (fs.existsSync(generatedAab)) {
      fs.copyFileSync(generatedAab, targetAab);
      console.log(`\n🎉 [نجاح] تم توليد واستخراج حزمة المتجر الرسمية (AAB) بنجاح:`);
      console.log(`   📦 ${targetAab}`);
      console.log(`\n🌐 جاهزة للرفع مباشرة على لوحة Google Play Console!`);
    }
  } else {
    console.log('ℹ️ Gradle wrapper not found, please open frontend/android in Android Studio.');
  }
} catch (err) {
  console.error('❌ Build error during Gradle bundle execution:', err?.message);
}
