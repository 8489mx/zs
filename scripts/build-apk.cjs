const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'frontend', 'android');
const releaseDir = path.join(rootDir, 'release', 'mobile');

console.log('📱 ========================================================');
console.log('📱    Z-Systems ERP — Android APK Native Build Engine     ');
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
  console.log('\n📱 يمكنك استخراج وتوليد الـ APK بإحدى طريقتين:');
  console.log('   1. فتح المجلد "frontend/android" مباشرة في برنامج Android Studio ثم الضغط على:');
  console.log('      Build > Build Bundle(s) / APK(s) > Build APK(s)');
  console.log('   2. تثبيت JDK 17+ وضبط JAVA_HOME، ثم إعادة تشغيل هذا السكريبت:');
  console.log('      npm run mobile:apk\n');
  process.exit(0);
}

// 3. If Java is available, run Gradle build
console.log('\n☕ Java detected. Building Android APK via Gradle...');
fs.mkdirSync(releaseDir, { recursive: true });

try {
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';
  const gradlewPath = path.join(androidDir, gradlewCmd);

  if (fs.existsSync(gradlewPath)) {
    console.log(`🚀 Executing ${gradlewCmd} assembleDebug...`);
    execSync(`${gradlewCmd} assembleDebug`, { cwd: androidDir, stdio: 'inherit' });

    const generatedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    const targetApk = path.join(releaseDir, 'ZSystems-ERP-v1.1.30-debug.apk');

    if (fs.existsSync(generatedApk)) {
      fs.copyFileSync(generatedApk, targetApk);
      console.log(`\n🎉 [نجاح] تم توليد واستخراج حزمة الـ APK بنجاح:`);
      console.log(`   📦 ${targetApk}`);
    }
  } else {
    console.log('ℹ️ Gradle wrapper not found, please open frontend/android in Android Studio.');
  }
} catch (err) {
  console.error('❌ Build error during Gradle execution:', err?.message);
}
