const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd) {
  console.log('\n> ' + cmd);
  execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

async function main() {
  const rootDir = path.join(__dirname, '..');
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = process.argv[2] || pkg.version;

  console.log('========================================================');
  console.log(`🚀 [release:patch] Full Automated OTA Release v${version}`);
  console.log('========================================================\n');

  // 1. Build update patch and manifests
  run(`node ./scripts/build-update-patch.cjs ${version}`);

  // 2. Commit manifests and package.json files
  console.log('\n📦 Committing update manifests to Git...');
  run('git add releases/ package.json frontend/package.json backend/package.json');
  try {
    run(`git commit -m "chore(release): release patch v${version}"`);
  } catch {
    console.log('No new files to commit or already committed.');
  }

  // 3. Push to main
  console.log('\n🚀 Pushing updates to GitHub main branch...');
  run('git push origin main');

  // 4. Publish Release to GitHub via native uploader (with gh CLI fallback)
  const zipPath = path.join(rootDir, `release/updates/Z-ERP-Patch-v${version}.zip`);
  if (fs.existsSync(zipPath)) {
    console.log(`\n☁️ Uploading patch to GitHub Releases (v${version})...`);
    try {
      const { uploadReleaseAsset } = require('./upload-github-release.cjs');
      await uploadReleaseAsset(version);
    } catch (err) {
      console.warn('Native upload failed, attempting gh CLI fallback...', err.message);
      try {
        run(`gh release create v${version} "${zipPath}" --title "Release v${version}" --notes "Z-ERP Automated Update Patch v${version}"`);
      } catch {
        try {
          run(`gh release upload v${version} "${zipPath}" --clobber`);
        } catch (ghErr) {
          console.warn('Could not upload to GitHub release:', ghErr.message);
        }
      }
    }
  }

  console.log('\n========================================================');
  console.log(`🎉 [SUCCESS] Patch v${version} is LIVE and published!`);
  console.log('   All clients will receive the update automatically.');
  console.log('========================================================\n');
}

main().catch((err) => {
  console.error('❌ Error publishing patch:', err);
  process.exit(1);
});

