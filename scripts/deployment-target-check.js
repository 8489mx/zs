const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const deployDir = path.join(root, 'deploy');
const reportPath = path.join(root, 'deployment-target-check-report.json');
const reportMdPath = path.join(docsDir, 'deployment-target-check.md');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function push(list, severity, code, message) {
  list.push({ severity, code, message });
}

const findings = [];
const requiredFiles = [
  'deploy/nginx/zsystems.conf.example',
  'deploy/systemd/zsystems.service.example',
  'docs/production-deployment-runbook.md',
  '.env.production.example',
];

for (const rel of requiredFiles) {
  if (!exists(rel)) push(findings, 'error', 'missing_file', `${rel} is missing.`);
}

const nginxPath = path.join(deployDir, 'nginx', 'zsystems.conf.example');
if (fs.existsSync(nginxPath)) {
  const src = read(nginxPath);
  if (!/listen 443 ssl http2;/.test(src)) push(findings, 'error', 'nginx_tls_missing', 'nginx template must listen on 443 with TLS.');
  if (!/proxy_pass http:\/\/127\.0\.0\.1:3000;/.test(src)) push(findings, 'error', 'nginx_proxy_missing', 'nginx template must proxy to 127.0.0.1:3000.');
  if (!/X-Forwarded-Proto https/.test(src)) push(findings, 'error', 'nginx_forwarded_proto_missing', 'nginx template must forward the https proto header.');
  if (!/server_name pos\.example\.com;/.test(src)) push(findings, 'warning', 'nginx_server_name_unedited', 'nginx template still contains the example server_name.');
}

const systemdPath = path.join(deployDir, 'systemd', 'zsystems.service.example');
if (fs.existsSync(systemdPath)) {
  const src = read(systemdPath);
  if (!/EnvironmentFile=\/etc\/zsystems\/zsystems\.env/.test(src)) push(findings, 'error', 'systemd_env_file_missing', 'systemd template must read /etc/zsystems/zsystems.env.');
  if (!/ExecStartPre=.*npm run verify:production:startup/.test(src)) push(findings, 'error', 'systemd_preflight_missing', 'systemd template must run verify:production:startup before boot.');
  if (!/ExecStart=.*npm run start:prod:safe/.test(src)) push(findings, 'error', 'systemd_execstart_missing', 'systemd template must use start:prod:safe.');
  if (!/Restart=always/.test(src)) push(findings, 'warning', 'systemd_restart_policy_missing', 'systemd template should restart automatically on failure.');
}

const packageJson = JSON.parse(read(path.join(root, 'package.json')));
const scripts = packageJson.scripts || {};
if (!scripts['deploy:target:check']) push(findings, 'error', 'npm_script_missing', 'package.json must define deploy:target:check.');
if (!scripts['start:prod:safe']) push(findings, 'error', 'safe_start_missing', 'package.json must define start:prod:safe.');

const launchGate = exists('src/launch-gate.js') ? read(path.join(root, 'src', 'launch-gate.js')) : '';
if (!launchGate.includes('missing_deployment_target_check_script')) push(findings, 'warning', 'launch_gate_not_wired', 'launch gate should validate deployment-target-check wiring.');

const output = {
  generatedAt: new Date().toISOString(),
  ok: findings.every((item) => item.severity !== 'error'),
  findings,
};

fs.writeFileSync(reportPath, JSON.stringify(output, null, 2));
const lines = [
  '# Deployment target check',
  '',
  `- Generated at: ${output.generatedAt}`,
  `- Result: ${output.ok ? 'pass' : 'fail'}`,
  '',
  '## Findings',
  ...(findings.length ? findings.map((item) => `- [${item.severity}] ${item.code}: ${item.message}`) : ['- none']),
  '',
].join('\n');
fs.writeFileSync(reportMdPath, lines);
console.log(`[deployment-target-check] wrote ${path.relative(root, reportPath)}`);
console.log(`[deployment-target-check] wrote ${path.relative(root, reportMdPath)}`);
if (!output.ok && process.argv.includes('--strict')) process.exit(1);
