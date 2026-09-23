/**
 * Node.js Load Testing Launcher
 * 
 * Usage:
 *   node load-tests/runner.cjs [scenario-name]
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scenarioArg = process.argv[2] || 'scenarios/stress-all.js';
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
  const run = spawnSync('k6', ['run', scenarioPath], { stdio: 'inherit' });
  process.exit(run.status || 0);
}

// Check docker
const dockerCheck = spawnSync('docker', ['--version'], { stdio: 'pipe' });
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
    'run', relScenario,
  ];
  const run = spawnSync('docker', dockerArgs, { stdio: 'inherit' });
  process.exit(run.status || 0);
}

console.error('[ERROR] Neither k6 CLI nor Docker were detected.');
console.error('Please install k6 (https://k6.io/docs/get-started/installation/) or Docker to run load tests.');
console.error('See docs/LOAD_TESTING.md for complete instructions.');
process.exit(1);
