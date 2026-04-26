#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { forbiddenReleasePaths, verifyPortableRelease } = require('./verify-customer-portable-release.cjs');

const repoRoot = path.resolve(__dirname, '..');
const defaultOutputDir = path.join(repoRoot, 'release', 'customer-portable');

const portableCopyExcludes = [
  'app',
  'runtime/data',
  'runtime/logs',
  'runtime/run',
  'config/.env.offline',
];

function toPortablePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function assertInside(parent, target) {
  const parentFull = path.resolve(parent);
  const targetFull = path.resolve(target);
  if (targetFull !== parentFull && !targetFull.startsWith(parentFull + path.sep)) {
    throw new Error(`Refusing to write outside ${parentFull}: ${targetFull}`);
  }
}

function isExcludedPortablePath(relPath) {
  const normalized = toPortablePath(relPath);
  return portableCopyExcludes.some((excluded) => normalized === excluded || normalized.startsWith(`${excluded}/`));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanOutputDir(outputDir) {
  const outputFull = path.resolve(outputDir);
  assertInside(repoRoot, outputFull);
  if (outputFull === repoRoot) {
    throw new Error('Output directory cannot be the repository root.');
  }
  fs.rmSync(outputFull, { recursive: true, force: true });
  ensureDir(outputFull);
}

function copyDirectoryFiltered(sourceDir, targetDir, options = {}) {
  const exclude = options.exclude || (() => false);
  const sourceFull = path.resolve(sourceDir);
  const targetFull = path.resolve(targetDir);
  if (!fs.existsSync(sourceFull)) {
    throw new Error(`Missing source directory: ${sourceFull}`);
  }

  function copyEntry(currentSource, currentTarget) {
    const relPath = toPortablePath(path.relative(sourceFull, currentSource));
    if (relPath && exclude(relPath)) return;

    const stat = fs.statSync(currentSource);
    if (stat.isDirectory()) {
      ensureDir(currentTarget);
      for (const entry of fs.readdirSync(currentSource)) {
        copyEntry(path.join(currentSource, entry), path.join(currentTarget, entry));
      }
      return;
    }

    ensureDir(path.dirname(currentTarget));
    fs.copyFileSync(currentSource, currentTarget);
  }

  copyEntry(sourceFull, targetFull);
}

function copyRequiredPath(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing required source path: ${source}`);
  }
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.cpSync(source, target, { recursive: true, force: true });
    return;
  }
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function removeForbiddenReleasePaths(outputDir) {
  for (const relPath of forbiddenReleasePaths) {
    const fullPath = path.join(outputDir, relPath);
    assertInside(outputDir, fullPath);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function npmCommand() {
  return os.platform() === 'win32' ? 'npm.cmd' : 'npm';
}

function parseArgs(argv) {
  const options = { outputDir: defaultOutputDir, skipBuild: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--skip-build') {
      options.skipBuild = true;
      continue;
    }
    if (arg === '--output') {
      const value = argv[index + 1];
      if (!value) throw new Error('--output requires a directory value');
      options.outputDir = path.resolve(repoRoot, value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function buildCustomerPortableRelease(options = {}) {
  const outputDir = path.resolve(options.outputDir || defaultOutputDir);
  if (!options.skipBuild) {
    const npm = npmCommand();
    run(npm, ['--prefix', 'backend', 'run', 'build']);
    run(npm, ['--prefix', 'frontend', 'run', 'build']);
  }

  cleanOutputDir(outputDir);
  copyDirectoryFiltered(path.join(repoRoot, 'portable'), outputDir, { exclude: isExcludedPortablePath });
  removeForbiddenReleasePaths(outputDir);

  const outputBackend = path.join(outputDir, 'app', 'backend');
  const outputFrontend = path.join(outputDir, 'app', 'frontend');
  ensureDir(outputBackend);
  ensureDir(outputFrontend);

  copyRequiredPath(path.join(repoRoot, 'backend', 'dist'), path.join(outputBackend, 'dist'));
  copyRequiredPath(path.join(repoRoot, 'backend', 'package.json'), path.join(outputBackend, 'package.json'));
  copyRequiredPath(path.join(repoRoot, 'backend', 'node_modules'), path.join(outputBackend, 'node_modules'));
  copyDirectoryFiltered(path.join(repoRoot, 'frontend', 'dist'), outputFrontend);
  removeForbiddenReleasePaths(outputDir);

  verifyPortableRelease(outputDir);
  return outputDir;
}

function runCli() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const outputDir = buildCustomerPortableRelease(options);
    console.log(`Customer portable release assembled: ${outputDir}`);
  } catch (error) {
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  buildCustomerPortableRelease,
  copyDirectoryFiltered,
  isExcludedPortablePath,
  portableCopyExcludes,
};
