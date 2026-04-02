#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const zipPath = path.join(distDir, 'zsystems-source-clean.zip');
const reportPath = path.join(root, 'docs', 'source-handoff-summary.md');
const legacyStageDir = path.join(distDir, 'source-handoff');

const excludeMatchers = [
  /^node_modules($|\/)/,
  /^frontend\/node_modules($|\/)/,
  /^dist($|\/)/,
  /^frontend\/dist($|\/)/,
  /^data($|\/)/,
  /^cutover-pack($|\/)/,
  /^work($|\/)/,
  /^.*\.db(-wal|-shm)?$/i,
  /^.*\.sqlite(-wal|-shm)?$/i,
  /^.*\.log$/i,
  /^\.env(\..+)?$/i,
  /^frontend\/.*\.tsbuildinfo$/i,
  /^.*\.tsbuildinfo$/i,
];

function shouldExclude(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  if (normalized === '.env.example' || normalized === '.env.production.example') return false;
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
      continue;
    }
    if (entry.isFile()) {
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function countNestedSourceHandoffDirs(startDir) {
  let count = 0;
  const stack = [startDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const child = path.join(current, entry.name);
      if (entry.name === 'source-handoff') count += 1;
      stack.push(child);
    }
  }
  return count;
}

ensureDir(distDir);
fs.rmSync(legacyStageDir, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zsystems-source-handoff-'));
const stageDir = path.join(tempRoot, 'stage');
ensureDir(stageDir);

try {
  copyTree(root, stageDir);
  execFileSync('zip', ['-qr', zipPath, '.'], { cwd: stageDir, stdio: 'inherit' });

  const sizeBytes = fs.statSync(zipPath).size;
  const nestedCount = countNestedSourceHandoffDirs(stageDir);
  const lines = [
    '# Source handoff summary',
    '',
    `- Generated at: ${new Date().toISOString()}`,
    `- Archive: ${path.relative(root, zipPath)}`,
    `- Size (bytes): ${sizeBytes}`,
    `- Temporary stage root: ${tempRoot}`,
    `- Nested source-handoff directories in stage: ${nestedCount}`,
    '',
    '## Excluded patterns',
    ...excludeMatchers.map((matcher) => `- ${String(matcher)}`),
    '',
  ];
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`[source-handoff] wrote ${path.relative(root, zipPath)}`);
  console.log(`[source-handoff] wrote ${path.relative(root, reportPath)}`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
