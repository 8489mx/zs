const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('[build-electron-release] Starting custom Electron build process...');

  try {
    // 1. Read version from root package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;

    if (!version) {
      throw new Error('Could not read version from package.json');
    }

    console.log(`[build-electron-release] Detected version: ${version}`);

    // 2. Run electron-builder
    console.log('[build-electron-release] Running electron-builder...');
    // We execute it in the frontend directory where the electron builder config is
    execSync('npx electron-builder', { 
        cwd: path.join(__dirname, '../frontend'), 
        stdio: 'inherit' 
    });

    console.log('[build-electron-release] electron-builder finished successfully.');

    // 3. Rename the output directory
    const releaseDir = path.join(__dirname, '../release');
    const sourceDir = path.join(releaseDir, 'win-unpacked');
    const targetDirName = `Z-ERP-Offline-v${version}-win-x64`;
    const targetDir = path.join(releaseDir, targetDirName);

    if (!fs.existsSync(sourceDir)) {
      console.warn(`[build-electron-release] Source directory not found: ${sourceDir}`);
      console.warn('[build-electron-release] Please verify if electron-builder configuration is outputting to win-unpacked.');
      process.exit(0); // Exit gracefully as it might have built an installer instead of a directory
    }

    // Clean up target directory if it exists from a previous build
    if (fs.existsSync(targetDir)) {
      console.log(`[build-electron-release] Found existing target directory: ${targetDirName}. Removing it...`);
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Rename the directory
    console.log(`[build-electron-release] Renaming 'win-unpacked' to '${targetDirName}'...`);
    fs.renameSync(sourceDir, targetDir);

    console.log(`[build-electron-release] ✅ Successfully generated release at: release/${targetDirName}`);
  } catch (error) {
    console.error('[build-electron-release] ❌ Error during build or rename process:', error);
    process.exit(1);
  }
}

main();
