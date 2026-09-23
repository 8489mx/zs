/**
 * Node.js Load Testing Launcher
 *
 * Usage:
 *   node load-tests/runner.cjs [scenario-name]
 *   PROFILE=heavy npm run test:load
 *
 * Profiles and env handling mirror run.sh; keep the three launchers in step.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scenarioArg = process.argv[2] || 'scenarios/stress-all.js';

// Load sizes, calibrated for the production box (2 cores / 12 GB / 4 GB swap) with the backend
// in a single PM2 fork process. See run.sh for why `extreme` runs without thresholds.
const PROFILES = {
  default: { PEAK_VUS: '50', RAMP_SECONDS: '15', HOLD_SECONDS: '30' },
  heavy: { PEAK_VUS: '150', RAMP_SECONDS: '30', HOLD_SECONDS: '90' },
  extreme: { PEAK_VUS: '300', RAMP_SECONDS: '45', HOLD_SECONDS: '120' },
  soak: { PEAK_VUS: '40', RAMP_SECONDS: '30', HOLD_SECONDS: '600' },
};

const profileName = process.env.PROFILE || 'default';
const profile = PROFILES[profileName];
if (!profile) {
  console.error(`[ERROR] Unknown PROFILE: ${profileName} (${Object.keys(PROFILES).join('|')})`);
  process.exit(1);
}

const PASSTHROUGH = [
  'TARGET_URL', 'STOREFRONT_SLUG', 'AUTH_USERNAME', 'AUTH_PASSWORD', 'TENANT_ID',
  'PEAK_VUS', 'RAMP_SECONDS', 'HOLD_SECONDS', 'SPOOF_CLIENT_IPS',
];

// k6 does not inherit the shell environment; every variable travels as an explicit -e flag.
const envArgs = [];
for (const key of PASSTHROUGH) {
  const value = process.env[key] || profile[key];
  if (value) envArgs.push('-e', `${key}=${value}`);
}
const extraArgs = profileName === 'extreme' ? ['--no-thresholds'] : [];

console.log(`[INFO] Profile ${profileName}: peak ${process.env.PEAK_VUS || profile.PEAK_VUS} VUs, `
  + `ramp ${process.env.RAMP_SECONDS || profile.RAMP_SECONDS}s, hold ${process.env.HOLD_SECONDS || profile.HOLD_SECONDS}s`);
if (extraArgs.length) console.log('[INFO] Thresholds are off: this run measures the limit, it does not assert an SLA.');
const scenarioPath = path.resolve(__dirname, scenarioArg);

if (!fs.existsSync(scenarioPath)) {
  console.error(`[ERROR] Scenario not found at: ${scenarioPath}`);
  console.log(`Available scenarios in ${path.join(__dirname, 'scenarios')}:`);
  const files = fs.readdirSync(path.join(__dirname, 'scenarios')).filter((f) => f.endsWith('.js'));
  files.forEach((f) => console.log(`  - scenarios/${f}`));
  process.exit(1);
}

// Check k6 CLI
const k6Check = spawnSync('k6', ['version'], { stdio: 'pipe' });
if (k6Check.status === 0) {
  console.log(`[INFO] Running k6 test with scenario: ${scenarioArg}`);
  const run = spawnSync('k6', ['run', ...extraArgs, ...envArgs, scenarioPath], { stdio: 'inherit' });
  process.exit(run.status || 0);
}

// Check docker. `docker --version` succeeds even when the daemon socket is not readable, so the
// probe has to be `docker info`; on the production server the ubuntu user needs sudo for it, which
// is why every script in this repo calls `sudo docker`.
const dockerDirect = spawnSync('docker', ['info'], { stdio: 'pipe' }).status === 0;
const dockerSudo = !dockerDirect && spawnSync('sudo', ['-n', 'docker', 'info'], { stdio: 'pipe' }).status === 0;
const dockerCheck = { status: dockerDirect || dockerSudo ? 0 : 1 };
if (dockerCheck.status === 0) {
  console.log(`[INFO] k6 binary not found locally. Running via Docker container...`);
  const rootDir = path.resolve(__dirname, '..');
  const relScenario = path.relative(path.join(__dirname), scenarioPath).replace(/\\/g, '/');
  const dockerArgs = [
    'run', '--rm', '-i',
    '-v', `${rootDir}:/work`,
    '-w', '/work/load-tests',
    '--network=host',
    'grafana/k6',
    'run', ...extraArgs, ...envArgs, relScenario,
  ];
  const run = dockerSudo
    ? spawnSync('sudo', ['-n', 'docker', ...dockerArgs], { stdio: 'inherit' })
    : spawnSync('docker', dockerArgs, { stdio: 'inherit' });
  process.exit(run.status || 0);
}

console.error('[ERROR] Neither k6 CLI nor Docker were detected.');
console.error('Please install k6 (https://k6.io/docs/get-started/installation/) or Docker to run load tests.');
console.error('See docs/LOAD_TESTING.md for complete instructions.');
process.exit(1);
