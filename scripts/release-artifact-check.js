#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const zipPath = path.join(root, 'dist', 'zsystems-release.zip');
const docsDir = path.join(root, 'docs');
const outputJsonPath = path.join(root, 'release-artifact-check-report.json');
const outputMdPath = path.join(docsDir, 'release-artifact-check.md');
const strict = process.argv.includes('--strict') || process.env.RELEASE_ARTIFACT_CHECK_STRICT === 'true';

const requiredEntries = [
  'package.json',
  'src/server.js',
  'frontend/dist/index.html',
  'RELEASE_CHECKLIST.md',
];
const forbiddenMatchers = [
  /^\.env(\..+)?$/i,
  /^node_modules($|\/)/,
  /^frontend\/node_modules($|\/)/,
  /^cutover-pack($|\/)/,
  /^dist\/release-package($|\/)/,
  /^.*\.db(-wal|-shm)?$/i,
  /^.*\.sqlite(-wal|-shm)?$/i,
  /^.*\.log$/i,
  /^.*\.tsbuildinfo$/i,
];

function listZipEntries(filePath) {
  const output = execFileSync('unzip', ['-Z1', filePath], { cwd: root, encoding: 'utf8' });
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const issues = [];
function addIssue(severity, code, message) {
  issues.push({ severity, code, message });
}

if (!fs.existsSync(zipPath)) {
  addIssue('error', 'zip_missing', `${path.relative(root, zipPath)} is missing.`);
}

const entries = fs.existsSync(zipPath) ? listZipEntries(zipPath) : [];
const missingRequired = requiredEntries.filter((entry) => !entries.includes(entry));
for (const entry of missingRequired) addIssue('error', 'required_missing', `Missing ${entry} in release archive.`);
const forbiddenEntries = entries.filter((entry) => forbiddenMatchers.some((matcher) => matcher.test(entry)));
for (const entry of forbiddenEntries) addIssue('error', 'forbidden_entry', `Forbidden entry found in archive: ${entry}`);

const report = {
  generatedAt: new Date().toISOString(),
  strict,
  zipPath: path.relative(root, zipPath),
  ok: issues.every((issue) => issue.severity !== 'error'),
  requiredEntries,
  missingRequired,
  forbiddenEntries,
  counts: {
    error: issues.filter((issue) => issue.severity === 'error').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
  },
  issues,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));
const md = [
  '# Release artifact check',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Strict mode: ${report.strict ? 'yes' : 'no'}`,
  `- Archive: ${report.zipPath}`,
  `- Passed: ${report.ok ? 'yes' : 'no'}`,
  `- Errors: ${report.counts.error}`,
  `- Warnings: ${report.counts.warning}`,
  '',
  '## Missing required entries',
  ...(missingRequired.length ? missingRequired.map((entry) => `- ${entry}`) : ['- none']),
  '',
  '## Forbidden entries',
  ...(forbiddenEntries.length ? forbiddenEntries.map((entry) => `- ${entry}`) : ['- none']),
  '',
  '## Issues',
  ...(issues.length ? issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}`) : ['- none']),
  '',
].join('\n');
fs.writeFileSync(outputMdPath, md);
console.log(`[release-artifact-check] wrote ${path.relative(root, outputJsonPath)}`);
console.log(`[release-artifact-check] wrote ${path.relative(root, outputMdPath)}`);
if (strict && !report.ok) {
  console.error('[release-artifact-check] strict mode failed.');
  process.exit(1);
}
