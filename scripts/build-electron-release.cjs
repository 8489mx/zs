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

    // 2. Terminate any running instance of the application to prevent Windows file-lock errors
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /F /IM "ZSystems POS.exe" /T', { stdio: 'ignore' });
      } catch {}
    }

    // 3. Run electron-builder
    console.log('[build-electron-release] Running electron-builder...');
    const runtimeDir = path.join(__dirname, '../portable/runtime');
    const requiredRuntime = [
      'postgres/bin/postgres.exe', 'postgres/bin/pg_ctl.exe',
      'postgres/bin/initdb.exe', 'postgres/bin/psql.exe',
      'postgres/bin/pg_dump.exe'
    ];
    for (const relative of requiredRuntime) {
      if (!fs.existsSync(path.join(runtimeDir, relative))) {
        throw new Error('Cannot produce offline customer build: required bundled runtime file missing: ' + relative);
      }
    }
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
      throw new Error('Electron output win-unpacked missing: refusing to report a successful release');
    }

    // Clean up target directory if it exists from a previous build
    if (fs.existsSync(targetDir)) {
      console.log(`[build-electron-release] Found existing target directory: ${targetDirName}. Removing it...`);
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Rename the directory
    console.log(`[build-electron-release] Renaming 'win-unpacked' to '${targetDirName}'...`);
    fs.renameSync(sourceDir, targetDir);

    // Refuse a green release result unless the actual unpacked EXE is bootable
    // and contains its database, API, renderer and update machinery.
    const requiredOutput = [
      'ZSystems POS.exe',
      'runtime/postgres/bin/postgres.exe',
      'runtime/postgres/bin/pg_ctl.exe',
      'resources/app.asar.unpacked/electron/backend/dist/main.js',
      'resources/app.asar.unpacked/dist/index.html',
      'tools/launcher/scripts/ApplyAndRestart.ps1',
    ];
    const missingOutput = requiredOutput.filter((p) => !fs.existsSync(path.join(targetDir, p)));
    if (missingOutput.length) {
      throw new Error('Electron release is incomplete. Missing: ' + missingOutput.join(', '));
    }
    console.log(`[build-electron-release] ✅ Validated customer release at: release/${targetDirName}`);
  } catch (error) {
    console.error('[build-electron-release] ❌ Error during build or rename process:', error);
    process.exit(1);
  }
}

main();
