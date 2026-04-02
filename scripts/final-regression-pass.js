const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const timestamp = new Date().toISOString();
const strict = process.env.FINAL_REGRESSION_STRICT === 'true';

function resolveQaRunner() {
  const candidates = [
    path.join(root, 'frontend', 'scripts', 'run-phase60-qa.mjs'),
    path.join(root, 'frontend', 'scripts', 'run-phase59-qa.mjs'),
    path.join(root, 'frontend', 'scripts', 'run-phase58-qa.mjs'),
    path.join(root, 'frontend', 'scripts', 'run-phase57-qa.mjs'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function dependencyReady(packageName, baseDir) {
  try {
    require.resolve(`${packageName}/package.json`, { paths: [baseDir] });
    return true;
  } catch {
    return false;
  }
}

const qaRunner = resolveQaRunner();
if (!qaRunner) {
  console.error('[final-regression] missing frontend QA runner (phase60/59/58/57)');
  process.exit(1);
}

const frontendRuntimeReady = dependencyReady('react', path.join(root, 'frontend')) && dependencyReady('vite', path.join(root, 'frontend'));
const backendRuntimeReady = dependencyReady('express', root) && dependencyReady('cookie-parser', root);
const warnings = [];
if (!frontendRuntimeReady) warnings.push('Frontend build dependencies are not installed. Frontend build will be skipped in portable mode.');
if (!backendRuntimeReady) warnings.push('Root runtime dependencies are not installed. Runtime smoke/integration checks will be skipped.');

if (strict && (!frontendRuntimeReady || !backendRuntimeReady)) {
  console.error('[final-regression] strict mode requires installed frontend and backend dependencies.');
  process.exit(1);
}

const steps = [
  { label: 'npm run syntax:check', cmd: 'npm', args: ['run', 'syntax:check'], enabled: true },
  { label: 'npm test', cmd: 'npm', args: ['test'], enabled: true },
  { label: path.relative(root, qaRunner), cmd: process.execPath, args: [qaRunner], enabled: true },
  { label: 'npm --prefix frontend run build', cmd: 'npm', args: ['--prefix', 'frontend', 'run', 'build'], enabled: frontendRuntimeReady },
  { label: 'npm run smoke-test', cmd: 'npm', args: ['run', 'smoke-test'], enabled: backendRuntimeReady },
  { label: 'npm run test:integration', cmd: 'npm', args: ['run', 'test:integration'], enabled: backendRuntimeReady },
];

const report = {
  generatedAt: timestamp,
  strict,
  frontendRuntimeReady,
  backendRuntimeReady,
  warnings,
  steps: [],
};

for (const step of steps) {
  if (!step.enabled) {
    const reason = step.label.includes('frontend') ? 'frontend_dependencies_missing' : 'runtime_dependencies_missing';
    report.steps.push({ label: step.label, status: 'skipped', reason });
    console.log(`[final-regression] skipped: ${step.label} (${reason})`);
    continue;
  }

  try {
    console.log(`[final-regression] running: ${step.label}`);
    execFileSync(step.cmd, step.args, { stdio: 'inherit', cwd: root });
    report.steps.push({ label: step.label, status: 'passed' });
  } catch (error) {
    report.steps.push({ label: step.label, status: 'failed', code: error.status ?? 1 });
    fs.writeFileSync(path.join(root, 'final-regression-report.json'), JSON.stringify(report, null, 2));
    process.exit(error.status || 1);
  }
}

fs.writeFileSync(path.join(root, 'final-regression-report.json'), JSON.stringify(report, null, 2));
console.log('[final-regression] completed successfully');
