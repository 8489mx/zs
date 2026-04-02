#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const zipPath = path.join(root, 'dist', 'zsystems-source-clean.zip');
const outputJsonPath = path.join(root, 'source-handoff-check-report.json');
const outputMdPath = path.join(docsDir, 'source-handoff-check.md');

const requiredEntries = [
  'package.json',
  'README.md',
  '.env.production.example',
  'src/server.js',
  'frontend/package.json',
];

const forbiddenMatchers = [
  /^node_modules($|\/)/,
  /^frontend\/node_modules($|\/)/,
  /^dist($|\/)/,
  /^frontend\/dist($|\/)/,
  /^data($|\/)/,
  /^cutover-pack($|\/)/,
  /^work($|\/)/,
  /^\.env($|\..+)/i,
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
for (const entry of missingRequired) addIssue('error', 'required_missing', `Missing ${entry} in source handoff archive.`);
const forbiddenEntries = entries.filter((entry) => {
  if (entry === '.env.example' || entry === '.env.production.example') return false;
  return forbiddenMatchers.some((matcher) => matcher.test(entry));
});
for (const entry of forbiddenEntries) addIssue('error', 'forbidden_entry', `Forbidden entry found in source archive: ${entry}`);

const report = {
  generatedAt: new Date().toISOString(),
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
  '# Source handoff check',
  '',
  `- Generated at: ${report.generatedAt}`,
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
console.log(`[source-handoff-check] wrote ${path.relative(root, outputJsonPath)}`);
console.log(`[source-handoff-check] wrote ${path.relative(root, outputMdPath)}`);
if (!report.ok) {
  console.error('[source-handoff-check] source handoff archive failed validation.');
  process.exit(1);
}
