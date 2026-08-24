const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('[build-update-patch] Starting update patch generation...');
  try {
    const rootDir = path.join(__dirname, '..');
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const version = process.argv[2] || pkg.version;
    
    if (!version) {
      throw new Error('Could not read version from package.json');
    }

    console.log(`[build-update-patch] Target version: ${version}`);

    // Update package.json files to target version so Vite and NestJS bake the correct version
    const packagesToUpdate = [
      path.join(rootDir, 'package.json'),
      path.join(rootDir, 'frontend', 'package.json'),
      path.join(rootDir, 'backend', 'package.json'),
    ];
    for (const p of packagesToUpdate) {
      if (fs.existsSync(p)) {
        const json = JSON.parse(fs.readFileSync(p, 'utf8'));
        json.version = version;
        fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n', 'utf8');
      }
    }

    // Build backend and frontend
    console.log('[build-update-patch] Building backend...');
    execSync('npm run build', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });
    
    console.log('[build-update-patch] Building frontend...');
    execSync('npm run build', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });

    // Staging area
    const stagingDir = path.join(rootDir, 'release/updates/staging');
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    
    // Create necessary folders
    fs.mkdirSync(path.join(stagingDir, 'backend/dist'), { recursive: true });
    fs.mkdirSync(path.join(stagingDir, 'frontend/dist'), { recursive: true });

    // Copy backend/dist
    console.log('[build-update-patch] Copying backend/dist...');
    fs.cpSync(path.join(rootDir, 'backend/dist'), path.join(stagingDir, 'backend/dist'), { recursive: true });
    
    // Copy backend/package.json
    console.log('[build-update-patch] Copying backend/package.json...');
    fs.copyFileSync(path.join(rootDir, 'backend/package.json'), path.join(stagingDir, 'backend/package.json'));

    // Copy frontend/dist
    console.log('[build-update-patch] Copying frontend/dist...');
    fs.cpSync(path.join(rootDir, 'frontend/dist'), path.join(stagingDir, 'frontend/dist'), { recursive: true });

    // Copy frontend/electron/loading.html to both dist and electron folders in patch staging
    const loadingHtml = path.join(rootDir, 'frontend/electron/loading.html');
    if (fs.existsSync(loadingHtml)) {
      fs.copyFileSync(loadingHtml, path.join(stagingDir, 'frontend/dist/loading.html'));
      fs.mkdirSync(path.join(stagingDir, 'frontend/electron'), { recursive: true });
      fs.copyFileSync(loadingHtml, path.join(stagingDir, 'frontend/electron/loading.html'));
    }

    // Generate update-manifest.json
    console.log('[build-update-patch] Generating update-manifest.json...');
    const crypto = require('crypto');
    function generateReleasePasscode(ver) {
      const manifestPath = path.join(rootDir, 'releases', `manifest-${ver}.json`);
      if (fs.existsSync(manifestPath)) {
        try {
          const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (m.passcode) return m.passcode;
        } catch { /* ignore */ }
      }
      const clean = ver.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
      const h = crypto.createHash('sha256').update(`ZS_SECRET_KEY_${ver}_2026_MASTER`).digest('hex').toUpperCase();
      return `ZS-UPD-${clean || '100'}-${h.substring(0, 4)}-${h.substring(4, 8)}`;
    }

    function getAllFiles(dirPath, arrayOfFiles = []) {
      const files = fs.readdirSync(dirPath);
      files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
          getAllFiles(fullPath, arrayOfFiles);
        } else {
          arrayOfFiles.push(fullPath);
        }
      });
      return arrayOfFiles;
    }

    const filesInStaging = getAllFiles(stagingDir);
    const manifestFiles = filesInStaging.map((fullPath) => {
      const relPath = path.relative(stagingDir, fullPath).replace(/\\/g, '/');
      const fileBuffer = fs.readFileSync(fullPath);
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      return { path: relPath, sha256, size: fileBuffer.length };
    });

    const manifest = {
      version,
      generatedAt: new Date().toISOString(),
      passcode: generateReleasePasscode(version),
      requiresPasscode: true,
      files: manifestFiles,
      expectedFolders: ['backend/dist', 'frontend/dist']
    };

    const AdmZip = require(path.join(rootDir, 'backend/node_modules/adm-zip'));
    const zip = new AdmZip();
    
    // Add all staging files with forward-slash paths
    const filesToZip = getAllFiles(stagingDir);
    for (const filePath of filesToZip) {
      const relPath = path.relative(stagingDir, filePath).replace(/\\/g, '/');
      const fileData = fs.readFileSync(filePath);
      zip.addFile(relPath, fileData);
    }
    
    // Add update-manifest.json
    zip.addFile('update-manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

    // Zip output
    const zipName = `Z-ERP-Patch-v${version}.zip`;
    const updatesDir = path.join(rootDir, 'release/updates');
    fs.mkdirSync(updatesDir, { recursive: true });
    
    const zipPath = path.join(updatesDir, zipName);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    console.log(`[build-update-patch] Writing ZIP with AdmZip to ${zipPath}...`);
    zip.writeZip(zipPath);
    
    // Save manifest to backend/runtime/releases and releases
    const runtimeReleasesDir = path.join(rootDir, 'backend/runtime/releases');
    fs.mkdirSync(runtimeReleasesDir, { recursive: true });
    
    const rootReleasesDir = path.join(rootDir, 'releases');
    fs.mkdirSync(rootReleasesDir, { recursive: true });

    const fullManifest = {
      version,
      generatedAt: manifest.generatedAt,
      passcode: manifest.passcode,
      requiresPasscode: true,
      changelog: `• ترقية شاملة لواجهة التحديثات بالتصميم الملكي.\n• إعادة بناء شاشة الإقلاع والفتح (Splash Screen) بهوية Z-ERP Enterprise ومراحل التحميل التفاعلية.\n• إضافة نظام كود التفعيل المنبثق وأرشيف الإصدارات السابقة القابل للطي.\n• تحسينات عامة على استقرار النظام ومزامنة قواعد البيانات.`,
      patchUrl: `https://github.com/8489mx/zs/releases/download/v${version}/Z-ERP-Patch-v${version}.zip`,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex'),
      sizeBytes: fs.statSync(zipPath).size,
      filesCount: manifestFiles.length
    };

    fs.writeFileSync(path.join(runtimeReleasesDir, `manifest-${version}.json`), JSON.stringify(fullManifest, null, 2), 'utf8');
    fs.writeFileSync(path.join(rootReleasesDir, `manifest-${version}.json`), JSON.stringify(fullManifest, null, 2), 'utf8');
    fs.writeFileSync(path.join(rootReleasesDir, 'manifest-latest.json'), JSON.stringify(fullManifest, null, 2), 'utf8');

    // Clean up staging
    console.log('[build-update-patch] Cleaning up staging directory...');
    fs.rmSync(stagingDir, { recursive: true, force: true });
    
    console.log(`[build-update-patch] ✅ Patch created successfully at release/updates/${zipName}`);
    console.log(`[build-update-patch] 🔑 Passcode for v${version}: ${manifest.passcode}`);
  } catch(e) {
    console.error('[build-update-patch] ❌ Error generating patch:', e);
    process.exit(1);
  }
}

main();
