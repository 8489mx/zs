const fs = require('fs');
const path = require('path');

const sourceDir = process.argv[2] || 'D:\\zs-frontend';
const targetDir = path.resolve(__dirname, '..', 'frontend');

console.log(`[Sync] Synchronizing updated storefront files from: ${sourceDir}`);
console.log(`[Sync] Target directory: ${targetDir}`);

if (!fs.existsSync(sourceDir)) {
  console.error(`[Error] Source directory ${sourceDir} does not exist.`);
  process.exit(1);
}

const syncTargets = [
  {
    src: path.join(sourceDir, 'src', 'features', 'storefront'),
    dest: path.join(targetDir, 'src', 'features', 'storefront'),
  },
  {
    src: path.join(sourceDir, 'src', 'styles', 'partials', 'storefront.css'),
    dest: path.join(targetDir, 'src', 'styles', 'partials', 'storefront.css'),
  },
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`  -> Updated: ${path.relative(targetDir, dest)}`);
  }
}

for (const target of syncTargets) {
  if (fs.existsSync(target.src)) {
    console.log(`\nSyncing ${path.basename(target.src)}...`);
    copyRecursive(target.src, target.dest);
  }
}

console.log('\n[Sync Complete] Storefront files successfully updated in main Z-Systems repository.');
