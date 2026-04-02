const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outputDir = path.join(root, 'cutover-pack');
const docsOutDir = path.join(outputDir, 'docs');
const reportsOutDir = path.join(outputDir, 'reports');
const templatesOutDir = path.join(outputDir, 'templates');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function copyIfExists(relativePath, destinationDir) {
  const sourcePath = path.join(root, relativePath);
  if (!fs.existsSync(sourcePath)) return false;
  const targetPath = path.join(destinationDir, path.basename(relativePath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

ensureDir(outputDir);
ensureDir(docsOutDir);
ensureDir(reportsOutDir);
ensureDir(templatesOutDir);

const closeoutPath = path.join(root, 'release-closeout-report.json');
const closeout = fs.existsSync(closeoutPath) ? readJson(closeoutPath) : null;

const copiedDocs = [
  'docs/release-closeout-summary.md',
  'docs/release-readiness-summary.md',
  'docs/cutover-status-validation.md',
  'docs/release-closeout-checklist.md',
  'docs/frontend-cutover-checklist.md',
  'docs/manual-cutover-runbook.md',
  'docs/post-launch-checklist.md',
  'docs/release-artifact-summary.md',
  'docs/release-artifact-check.md',
  'docs/production-env-check.md',
  'docs/production-startup-check.md',
  'docs/production-startup-check-report.md',
  'docs/deployment-target-check.md',
  'docs/production-deployment-runbook.md',
  'LAUNCH_CANDIDATE_GUIDE.md',
  'RELEASE_CHECKLIST.md',
].filter((relativePath) => copyIfExists(relativePath, docsOutDir));

const copiedReports = [
  'release-audit-report.json',
  'final-regression-report.json',
  'release-closeout-report.json',
  'cutover-status-validation-report.json',
  'release-readiness-report.json',
  'release-artifact-report.json',
  'release-artifact-check-report.json',
  'production-env-check-report.json',
  'production-startup-check-report.json',
  'deployment-target-check-report.json',
  'post-launch-verification-report.json',
  'frontend/route-live-sweep-report.json',
].filter((relativePath) => copyIfExists(relativePath, reportsOutDir));

const copiedTemplates = [
  'ops/manual-cutover-status.template.json',
  'ops/manual-cutover-status.json',
  'BUG_REPORT_TEMPLATE.csv',
  '.env.production.example',
  'deploy/nginx/zsystems.conf.example',
  'deploy/systemd/zsystems.service.example',
].filter((relativePath) => copyIfExists(relativePath, templatesOutDir));

const manifest = {
  generatedAt: new Date().toISOString(),
  releaseCandidate: closeout?.generatedAt ? 'phase61' : 'unknown',
  launchReady: Boolean(closeout?.launchReady),
  strictReady: Boolean(closeout?.strictReady),
  automatedChecksPassed: Boolean(closeout?.automatedChecksPassed),
  copiedDocs,
  copiedReports,
  copiedTemplates,
};

writeJson(path.join(outputDir, 'manifest.json'), manifest);

const lines = [
  '# Cutover pack',
  '',
  `- Generated at: ${manifest.generatedAt}`,
  `- Launch ready: ${manifest.launchReady ? 'yes' : 'no'}`,
  `- Strict automated checks: ${manifest.strictReady ? 'yes' : 'no'}`,
  `- Automated checks passed: ${manifest.automatedChecksPassed ? 'yes' : 'no'}`,
  '',
  '## Included docs',
  ...copiedDocs.map((file) => `- ${file}`),
  '',
  '## Included reports',
  ...copiedReports.map((file) => `- ${file}`),
  '',
  '## Included templates',
  ...copiedTemplates.map((file) => `- ${file}`),
  '',
  '## Recommended operator flow',
  '- Read docs/release-closeout-summary.md first.',
  '- Fill templates/manual-cutover-status.template.json into ops/manual-cutover-status.json before go-live.',
  '- Execute the deploy window using docs/manual-cutover-runbook.md and docs/release-closeout-checklist.md.',
  '- Use BUG_REPORT_TEMPLATE.csv for any production issues during stabilization.',
  '- Run node scripts/validate-cutover-status.js after filling ops/manual-cutover-status.json to confirm launch ownership and rollback data are complete.',
  '- Run node scripts/release-readiness-check.js after generating the closeout and cutover pack to produce the final sign-off report.',
  '- After go-live, run node scripts/post-launch-verification.js to generate the first post-launch verification report.',
  '',
].join('\n');

fs.writeFileSync(path.join(outputDir, 'README.md'), lines);
console.log(`[cutover-pack] wrote ${path.relative(root, outputDir)}`);
