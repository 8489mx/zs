const { execFileSync } = require('child_process');
const path = require('path');

const root = process.cwd();
const steps = [
  {
    label: 'frontend phase60 QA',
    cmd: 'npm',
    args: ['run', 'frontend:qa:phase60'],
  },
  {
    label: 'strict release audit',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'release-audit.js')],
    env: { RELEASE_AUDIT_STRICT: 'true' },
  },
  {
    label: 'strict final regression',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'final-regression-pass.js')],
    env: { FINAL_REGRESSION_STRICT: 'true' },
  },
  {
    label: 'release closeout summary',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'generate-release-closeout.js')],
  },
  {
    label: 'cutover status validation',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'validate-cutover-status.js')],
    env: { CUTOVER_STATUS_STRICT: 'true' },
  },
  {
    label: 'cutover pack',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'generate-cutover-pack.js')],
  },
  {
    label: 'release artifact build',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'build-release-artifact.js')],
  },
  {
    label: 'release artifact check',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'release-artifact-check.js'), '--strict'],
  },
  {
    label: 'production startup check',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'production-startup-check.js')],
  },
  {
    label: 'deployment target check',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'deployment-target-check.js'), '--strict'],
  },
  {
    label: 'release readiness summary',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'release-readiness-check.js')],
    env: { RELEASE_READINESS_STRICT: 'true' },
  },
  {
    label: 'cutover pack refresh',
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'generate-cutover-pack.js')],
  },
];

for (const step of steps) {
  console.log(`[strict-release-closeout] running: ${step.label}`);
  execFileSync(step.cmd, step.args, {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, ...(step.env || {}) },
  });
}

console.log('[strict-release-closeout] completed successfully');
