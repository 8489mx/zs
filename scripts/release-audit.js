const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const strict = process.env.RELEASE_AUDIT_STRICT === 'true';
const reportPath = path.join(root, 'release-audit-report.json');

function exists(filePath) {
  return fs.existsSync(filePath);
}

function resolveFrontendQaRunner() {
  const candidates = [
    path.join(root, 'frontend', 'scripts', 'run-phase60-qa.mjs'),
    path.join(root, 'frontend', 'scripts', 'run-phase59-qa.mjs'),
    path.join(root, 'frontend', 'scripts', 'run-phase58-qa.mjs'),
    path.join(root, 'frontend', 'scripts', 'run-phase57-qa.mjs'),
  ];
  return candidates.find((candidate) => exists(candidate));
}

function dependencyReady(packageName, baseDir) {
  try {
    require.resolve(`${packageName}/package.json`, { paths: [baseDir] });
    return true;
  } catch {
    return false;
  }
}

const qaRunner = resolveFrontendQaRunner();
if (!qaRunner) {
  console.error('[release-audit] missing frontend QA runner (phase60/59/58/57).');
  process.exit(1);
}

const frontendRuntimeReady = dependencyReady('react', path.join(root, 'frontend')) && dependencyReady('vite', path.join(root, 'frontend'));
const backendRuntimeReady = dependencyReady('express', root) && dependencyReady('cookie-parser', root);
const warnings = [];

if (!frontendRuntimeReady) {
  warnings.push('Frontend build dependencies are not installed. The audit will skip frontend build in portable mode.');
  if (strict) {
    console.error('[release-audit] strict mode requires npm --prefix frontend install.');
    process.exit(1);
  }
}

if (!backendRuntimeReady) {
  warnings.push('Root runtime dependencies are not installed. Runtime smoke/integration checks will be skipped in portable mode.');
  if (strict) {
    console.error('[release-audit] strict mode requires npm install in the project root.');
    process.exit(1);
  }
}

const commands = [
  { label: 'npm run source:clean', cmd: 'npm', args: ['run', 'source:clean'], enabled: true },
  { label: 'npm run syntax:check', cmd: 'npm', args: ['run', 'syntax:check'], enabled: true },
  { label: 'npm test', cmd: 'npm', args: ['test'], enabled: true },
  { label: path.relative(root, qaRunner), cmd: process.execPath, args: [qaRunner], enabled: true },
  { label: 'npm --prefix frontend run build', cmd: 'npm', args: ['--prefix', 'frontend', 'run', 'build'], enabled: frontendRuntimeReady },
  { label: 'npm run smoke-test', cmd: 'npm', args: ['run', 'smoke-test'], enabled: backendRuntimeReady },
  { label: 'npm run test:integration', cmd: 'npm', args: ['run', 'test:integration'], enabled: backendRuntimeReady },
];

const report = {
  generatedAt: new Date().toISOString(),
  strict,
  frontendRuntimeReady,
  backendRuntimeReady,
  warnings,
  steps: [],
};

for (const step of commands) {
  if (!step.enabled) {
    const reason = step.label.includes('frontend') ? 'frontend_dependencies_missing' : 'runtime_dependencies_missing';
    report.steps.push({ label: step.label, status: 'skipped', reason });
    console.log(`[release-audit] skipped: ${step.label} (${reason})`);
    continue;
  }

  try {
    console.log(`[release-audit] running: ${step.label}`);
    execFileSync(step.cmd, step.args, { stdio: 'inherit', cwd: root });
    report.steps.push({ label: step.label, status: 'passed' });
  } catch (error) {
    report.steps.push({ label: step.label, status: 'failed', code: error.status ?? 1 });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.exit(error.status || 1);
  }
}

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log('[release-audit] completed successfully');
