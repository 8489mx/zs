#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { loadEnvFile } = require('./lib/load-env-file');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outputJsonPath = path.join(root, 'production-startup-check-report.json');
const outputMdPath = path.join(docsDir, 'production-startup-check-report.md');

function parseArgs(argv) {
  const envFileIndex = argv.findIndex((arg) => arg === '--env-file');
  return {
    envFile: envFileIndex >= 0 && argv[envFileIndex + 1]
      ? path.resolve(root, argv[envFileIndex + 1])
      : path.resolve(root, process.env.PRODUCTION_ENV_FILE || '.env.production'),
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const args = parseArgs(process.argv.slice(2));
process.env.NODE_ENV = 'production';
const envFileState = loadEnvFile(root, args.envFile);
const envFileExists = envFileState.exists;

const config = require('../src/config');
const { analyzeRuntimeConfig } = require('../src/runtime-config-guard');

const result = analyzeRuntimeConfig(config, { envName: 'production', forceProduction: true });
const report = {
  generatedAt: new Date().toISOString(),
  envFile: path.relative(root, args.envFile),
  envFileExists,
  ...result,
};

ensureDir(docsDir);
fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));

const md = [
  '# Production startup check',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Env file: ${report.envFile}`,
  `- Env file exists: ${report.envFileExists ? 'yes' : 'no'}`,
  `- Launch-safe: ${report.ok ? 'yes' : 'no'}`,
  `- Errors: ${report.summary.errors}`,
  `- Warnings: ${report.summary.warnings}`,
  '',
  '## Findings',
  ...(report.findings.length
    ? report.findings.map((item) => `- [${item.severity}] ${item.code}: ${item.message}`)
    : ['- none']),
  '',
].join('\n');
fs.writeFileSync(outputMdPath, md);

console.log(`[production-startup-check] wrote ${path.relative(root, outputJsonPath)}`);
console.log(`[production-startup-check] wrote ${path.relative(root, outputMdPath)}`);

if (!envFileExists) {
  console.error('[production-startup-check] .env.production is missing. Create it from .env.production.example before launch.');
  process.exit(1);
}

if (!report.ok) {
  console.error('[production-startup-check] runtime configuration is not launch-safe. Resolve errors before production startup.');
  process.exit(1);
}
