const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function bumpPatchVersion(version) {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid semver version format: "${version}". Expected "x.y.z".`);
  }
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const patch = parseInt(parts[2], 10);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`Non-numeric semver values in version: "${version}".`);
  }

  return `${major}.${minor}.${patch + 1}`;
}

function updateJsonVersion(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  content.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
}

async function main() {
  console.log('====================================================');
  console.log('🚀 [build:new] Starting Auto-Version Bump & Build...');
  console.log('====================================================\n');

  try {
    const rootPkgPath = path.join(__dirname, '../package.json');
    const frontendPkgPath = path.join(__dirname, '../frontend/package.json');
    const backendPkgPath = path.join(__dirname, '../backend/package.json');

    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    const currentVersion = rootPkg.version || '1.0.0';
    const nextVersion = bumpPatchVersion(currentVersion);

    console.log(`📦 Current version : v${currentVersion}`);
    console.log(`✨ Bumping to      : v${nextVersion}\n`);

    // 1. Update version in all package.json files
    updateJsonVersion(rootPkgPath, nextVersion);
    updateJsonVersion(frontendPkgPath, nextVersion);
    updateJsonVersion(backendPkgPath, nextVersion);

    console.log('✅ Version updated in:');
    console.log('   - package.json');
    console.log('   - frontend/package.json');
    console.log('   - backend/package.json\n');

    // 2. Run the build:exe command
    console.log('🔨 Starting Electron build process...\n');
    execSync('npm --prefix frontend run build:exe', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    console.log('\n====================================================');
    console.log(`🎉 [build:new] Release v${nextVersion} completed successfully!`);
    console.log(`📁 Output location: release/Z-ERP-Offline-v${nextVersion}-win-x64`);
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ [build:new] Failed:', error.message);
    process.exit(1);
  }
}

main();
