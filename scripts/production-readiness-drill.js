#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createProductionDrillEnv } = require('./lib/create-production-drill-env');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outputJsonPath = path.join(root, 'production-readiness-drill-report.json');
const outputMdPath = path.join(docsDir, 'production-readiness-drill.md');

function runStep(name, command, args, options = {}) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
    });
    return { name, ok: true, command: [command, ...args].join(' '), stdout: stdout.trim(), stderr: '' };
  } catch (error) {
    return {
      name,
      ok: false,
      command: [command, ...args].join(' '),
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || error.message || '').trim(),
      status: typeof error.status === 'number' ? error.status : 1,
    };
  }
}

const drillEnv = createProductionDrillEnv();
const steps = [
  runStep('launch_gate_production', process.execPath, ['scripts/launch-gate.js', '--production-env-file', drillEnv.envFile], { env: drillEnv.env }),
  runStep('production_env_check_strict', process.execPath, ['scripts/production-env-check.js', '--strict'], { env: drillEnv.env }),
  runStep('production_startup_check', process.execPath, ['scripts/production-startup-check.js', '--env-file', drillEnv.envFile], { env: drillEnv.env }),
];

const report = {
  generatedAt: new Date().toISOString(),
  envFile: drillEnv.envFile,
  ok: steps.every((step) => step.ok),
  steps,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));
const md = [
  '# Production readiness drill',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Temporary env file: ${drillEnv.envFile}`,
  `- Passed: ${report.ok ? 'yes' : 'no'}`,
  '',
  '## Steps',
  ...steps.flatMap((step) => [
    `- ${step.name}: ${step.ok ? 'passed' : 'failed'}`,
    `  - Command: ${step.command}`,
    ...(step.stdout ? [`  - Stdout: ${step.stdout.replace(/\n/g, ' | ')}`] : []),
    ...(step.stderr ? [`  - Stderr: ${step.stderr.replace(/\n/g, ' | ')}`] : []),
  ]),
  '',
  '## Notes',
  '- The production drill and launch gate now use the same temporary production env file.',
  '- For real deployment, copy .env.production.example to .env.production on the target machine and replace placeholders with real values.',
  '',
].join('\n');
fs.writeFileSync(outputMdPath, md);
console.log(`[production-readiness-drill] wrote ${path.relative(root, outputJsonPath)}`);
console.log(`[production-readiness-drill] wrote ${path.relative(root, outputMdPath)}`);
drillEnv.cleanup();
if (!report.ok) process.exit(1);
