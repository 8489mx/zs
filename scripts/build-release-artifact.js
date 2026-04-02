#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const stageDir = path.join(distDir, 'release-package');
const zipPath = path.join(distDir, 'zsystems-release.zip');
const docsDir = path.join(root, 'docs');
const reportJsonPath = path.join(root, 'release-artifact-report.json');
const reportMdPath = path.join(docsDir, 'release-artifact-summary.md');
const frontendDistIndex = path.join(root, 'frontend', 'dist', 'index.html');

const excludeMatchers = [
  /^\.env(\..+)?$/i,
  /^node_modules($|\/)/,
  /^frontend\/node_modules($|\/)/,
  /^dist\/release-package($|\/)/,
  /^cutover-pack($|\/)/,
  /^work($|\/)/,
  /^.*\.db(-wal|-shm)?$/i,
  /^.*\.sqlite(-wal|-shm)?$/i,
  /^.*\.log$/i,
  /^frontend\/.*\.tsbuildinfo$/i,
  /^.*\.tsbuildinfo$/i,
];

function shouldExclude(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  return excludeMatchers.some((matcher) => matcher.test(normalized));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyTree(srcDir, destDir, relPrefix = '') {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(srcDir, entry.name);
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (shouldExclude(relPath)) continue;
    const targetPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      ensureDir(targetPath);
      copyTree(sourcePath, targetPath, relPath);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

ensureDir(distDir);
fs.rmSync(stageDir, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });
ensureDir(stageDir);
copyTree(root, stageDir);

const report = {
  generatedAt: new Date().toISOString(),
  stageDir: path.relative(root, stageDir),
  zipPath: path.relative(root, zipPath),
  frontendBuildPresent: fs.existsSync(frontendDistIndex),
  requiredPaths: [
    'package.json',
    'src/server.js',
    'frontend/dist/index.html',
    'RELEASE_CHECKLIST.md',
  ],
  excludedPatterns: excludeMatchers.map((matcher) => String(matcher)),
};

if (!report.frontendBuildPresent) {
  console.error('Missing frontend build output at frontend/dist/index.html. Run npm --prefix frontend run build first.');
  process.exit(1);
}

const missing = report.requiredPaths.filter((relPath) => !fs.existsSync(path.join(stageDir, relPath)));
report.missingRequiredPaths = missing;
if (missing.length) {
  console.error(`Release stage is missing required paths: ${missing.join(', ')}`);
  process.exit(1);
}

execFileSync('zip', ['-qr', zipPath, '.'], { cwd: stageDir, stdio: 'inherit' });
const zipStats = fs.statSync(zipPath);
report.sizeBytes = zipStats.size;

fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
fs.mkdirSync(docsDir, { recursive: true });
const md = [
  '# Release artifact summary',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Stage directory: ${report.stageDir}`,
  `- Archive: ${report.zipPath}`,
  `- Frontend build present: ${report.frontendBuildPresent ? 'yes' : 'no'}`,
  `- Archive size (bytes): ${report.sizeBytes}`,
  `- Missing required paths: ${missing.length ? missing.join(', ') : 'none'}`,
  '',
  '## Required paths',
  ...report.requiredPaths.map((item) => `- ${item}`),
  '',
  '## Excluded patterns',
  ...report.excludedPatterns.map((item) => `- ${item}`),
  '',
].join('\n');
fs.writeFileSync(reportMdPath, md);
console.log(`[release-artifact] wrote ${path.relative(root, reportJsonPath)}`);
console.log(`[release-artifact] wrote ${path.relative(root, reportMdPath)}`);
console.log(`[release-artifact] wrote ${path.relative(root, zipPath)}`);
