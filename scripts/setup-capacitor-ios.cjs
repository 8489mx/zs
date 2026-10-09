const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const iosDir = path.join(frontendDir, 'ios');

console.log('🍎 ========================================================');
console.log('🍎      Z-Systems ERP — Apple iOS Store Preparation        ');
console.log('🍎 ========================================================');

if (!fs.existsSync(iosDir)) {
  console.log('📦 iOS directory not found. Initializing iOS platform via Capacitor...');
  try {
    execSync('npx cap add ios', { cwd: frontendDir, stdio: 'inherit' });
    console.log('✅ [iOS Setup] Apple iOS project created successfully!');
  } catch (err) {
    console.error('⚠️ Note: iOS platform creation requires macOS or Capacitor CLI environment:', err.message);
  }
} else {
  console.log('ℹ️ iOS project already exists in frontend/ios.');
}

// 2. Info.plist Apple Review Compliance Instructions
const plistPrivacyKeys = `
<!-- Apple App Store Mandatory Review Privacy Descriptions (Arabic & English) -->
<key>NSCameraUsageDescription</key>
<string>يستخدم التطبيق الكاميرا لمسح باركود الأصناف وإرفاق صور المستندات وبصمة الحضور الذاتية.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>يستخدم التطبيق الموقع الجغرافي لتحديد نطاق الحضور والانصراف وتتبع مسار تسليم الطلبات.</string>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>يستخدم التطبيق البلوتوث للاتصال بطابعات الفواتير المحمولة وطباعة الإيصالات الفورية.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>يستخدم التطبيق معرض الصور لإرفاق المستندات والفواتير التشغيلية.</string>
`;

console.log('\n📋 [متطلبات اعتماد متجر آبل App Store]:');
console.log('   تم تجهيز نصوص الخصوصية المعتمدة (Privacy Usage Descriptions) لمنع أي رفض من مراجعي آبل:');
console.log(plistPrivacyKeys);
console.log('🍏 لفتح المشروع في Xcode على جهاز Mac:');
console.log('   cd frontend && npx cap open ios\n');
