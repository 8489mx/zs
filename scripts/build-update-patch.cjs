const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('[build-update-patch] Starting update patch generation...');
  try {
    const rootDir = path.join(__dirname, '..');
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const version = pkg.version;
    
    if (!version) {
      throw new Error('Could not read version from package.json');
    }

    console.log(`[build-update-patch] Detected version: ${version}`);

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

    // Zip
    const zipName = `Z-ERP-Patch-v${version}.zip`;
    const updatesDir = path.join(rootDir, 'release/updates');
    fs.mkdirSync(updatesDir, { recursive: true });
    
    const zipPath = path.join(updatesDir, zipName);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    console.log(`[build-update-patch] Zipping to ${zipPath}...`);
    // Using PowerShell Compress-Archive
    const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(psCommand, { stdio: 'inherit' });
    
    // Clean up staging
    console.log('[build-update-patch] Cleaning up staging directory...');
    fs.rmSync(stagingDir, { recursive: true, force: true });
    
    console.log(`[build-update-patch] ✅ Patch created successfully at release/updates/${zipName}`);
  } catch(e) {
    console.error('[build-update-patch] ❌ Error generating patch:', e);
    process.exit(1);
  }
}

main();
