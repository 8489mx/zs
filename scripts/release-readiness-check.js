const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const strict = process.env.RELEASE_READINESS_STRICT === 'true';
const maxAgeHours = Number(process.env.RELEASE_REPORT_MAX_AGE_HOURS || 48);
const outputJsonPath = path.join(root, 'release-readiness-report.json');
const outputMdPath = path.join(docsDir, 'release-readiness-summary.md');

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseIsoTimestamp(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : null;
}

function ageHours(value) {
  const time = parseIsoTimestamp(value);
  if (!time) return null;
  return Number(((Date.now() - time) / (1000 * 60 * 60)).toFixed(2));
}

function allPassed(report) {
  return Array.isArray(report?.steps) && report.steps.every((step) => step.status === 'passed');
}

function pushIssue(collection, severity, key, message) {
  collection.push({ severity, key, message });
}

const files = {
  releaseAudit: path.join(root, 'release-audit-report.json'),
  finalRegression: path.join(root, 'final-regression-report.json'),
  releaseCloseout: path.join(root, 'release-closeout-report.json'),
  cutoverStatusValidation: path.join(root, 'cutover-status-validation-report.json'),
  cutoverManifest: path.join(root, 'cutover-pack', 'manifest.json'),
  postLaunchVerification: path.join(root, 'post-launch-verification-report.json'),
  releaseArtifact: path.join(root, 'release-artifact-report.json'),
  releaseArtifactCheck: path.join(root, 'release-artifact-check-report.json'),
  productionEnvCheck: path.join(root, 'production-env-check-report.json'),
  productionStartupCheck: path.join(root, 'production-startup-check-report.json'),
  deploymentTargetCheck: path.join(root, 'deployment-target-check-report.json'),
};

const issues = [];
const report = {
  generatedAt: new Date().toISOString(),
  strict,
  maxAgeHours,
  files: {},
  launchReady: false,
  issues,
};

for (const [key, filePath] of Object.entries(files)) {
  if (!exists(filePath)) {
    report.files[key] = { exists: false };
    pushIssue(issues, ['postLaunchVerification', 'productionEnvCheck', 'productionStartupCheck'].includes(key) ? 'warning' : 'error', `${key}.missing`, `Missing ${path.relative(root, filePath)}.`);
    continue;
  }
  const payload = readJson(filePath);
  const generatedAt = payload.generatedAt || null;
  const hoursOld = ageHours(generatedAt);
  report.files[key] = {
    exists: true,
    path: path.relative(root, filePath),
    generatedAt,
    hoursOld,
  };
  if (hoursOld == null) {
    pushIssue(issues, 'warning', `${key}.timestamp_missing`, `${path.relative(root, filePath)} does not expose a valid generatedAt timestamp.`);
  } else if (hoursOld > maxAgeHours) {
    pushIssue(issues, strict ? 'error' : 'warning', `${key}.stale`, `${path.relative(root, filePath)} is ${hoursOld} hours old which exceeds ${maxAgeHours} hours.`);
  }
}

const releaseAudit = exists(files.releaseAudit) ? readJson(files.releaseAudit) : null;
const finalRegression = exists(files.finalRegression) ? readJson(files.finalRegression) : null;
const releaseCloseout = exists(files.releaseCloseout) ? readJson(files.releaseCloseout) : null;
const cutoverStatusValidation = exists(files.cutoverStatusValidation) ? readJson(files.cutoverStatusValidation) : null;
const cutoverManifest = exists(files.cutoverManifest) ? readJson(files.cutoverManifest) : null;
const postLaunchVerification = exists(files.postLaunchVerification) ? readJson(files.postLaunchVerification) : null;
const releaseArtifact = exists(files.releaseArtifact) ? readJson(files.releaseArtifact) : null;
const releaseArtifactCheck = exists(files.releaseArtifactCheck) ? readJson(files.releaseArtifactCheck) : null;
const productionEnvCheck = exists(files.productionEnvCheck) ? readJson(files.productionEnvCheck) : null;
const productionStartupCheck = exists(files.productionStartupCheck) ? readJson(files.productionStartupCheck) : null;
const deploymentTargetCheck = exists(files.deploymentTargetCheck) ? readJson(files.deploymentTargetCheck) : null;

if (releaseAudit && !allPassed(releaseAudit)) {
  pushIssue(issues, 'error', 'releaseAudit.failed', 'release-audit-report.json contains failed or skipped steps.');
}
if (finalRegression && !allPassed(finalRegression)) {
  pushIssue(issues, 'error', 'finalRegression.failed', 'final-regression-report.json contains failed or skipped steps.');
}
if (releaseCloseout && releaseCloseout.launchReady !== true) {
  pushIssue(issues, strict ? 'error' : 'warning', 'releaseCloseout.not_ready', 'release-closeout-report.json is not marked launchReady=true.');
}
if (cutoverStatusValidation && cutoverStatusValidation.readyForLaunch !== true) {
  pushIssue(issues, strict ? 'error' : 'warning', 'cutoverStatus.not_ready', 'Cutover status validation is not ready for launch.');
}
if (cutoverManifest) {
  if (cutoverManifest.launchReady !== true) {
    pushIssue(issues, strict ? 'error' : 'warning', 'cutoverManifest.not_ready', 'cutover-pack/manifest.json is not marked launchReady=true.');
  }
  for (const requiredReport of ['release-audit-report.json', 'final-regression-report.json', 'release-closeout-report.json', 'cutover-status-validation-report.json', 'release-readiness-report.json']) {
    if (!Array.isArray(cutoverManifest.copiedReports) || !cutoverManifest.copiedReports.includes(requiredReport)) {
      pushIssue(issues, 'warning', 'cutoverManifest.report_missing', `Cutover manifest does not include ${requiredReport}.`);
    }
  }
}
if (postLaunchVerification && postLaunchVerification.usingTemplate === true) {
  pushIssue(issues, 'warning', 'postLaunch.template_only', 'Post-launch verification is still based on the template status file only.');
}

if (releaseArtifact) {
  if (releaseArtifact.frontendBuildPresent !== true) {
    pushIssue(issues, 'error', 'releaseArtifact.frontend_missing', 'Release artifact report does not confirm frontend/dist/index.html.');
  }
  if (Array.isArray(releaseArtifact.missingRequiredPaths) && releaseArtifact.missingRequiredPaths.length) {
    pushIssue(issues, 'error', 'releaseArtifact.required_missing', `Release artifact is missing required paths: ${releaseArtifact.missingRequiredPaths.join(', ')}`);
  }
}
if (releaseArtifactCheck && releaseArtifactCheck.ok !== true) {
  pushIssue(issues, 'error', 'releaseArtifactCheck.failed', 'Release artifact check reported forbidden or missing archive entries.');
}
if (productionEnvCheck && productionEnvCheck.ok !== true) {
  pushIssue(issues, strict ? 'error' : 'warning', 'productionEnvCheck.failed', 'Production environment check still reports blocking issues.');
}
if (productionStartupCheck && productionStartupCheck.ok !== true) {
  pushIssue(issues, strict ? 'error' : 'warning', 'productionStartupCheck.failed', 'Production startup check still reports blocking issues.');
}
if (deploymentTargetCheck && deploymentTargetCheck.ok !== true) {
  pushIssue(issues, strict ? 'error' : 'warning', 'deploymentTargetCheck.failed', 'Deployment target check still reports blocking issues.');
}

const errorCount = issues.filter((issue) => issue.severity === 'error').length;
const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
report.counts = { error: errorCount, warning: warningCount };
report.launchReady = errorCount === 0;

const md = [
  '# Release readiness summary',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Strict mode: ${report.strict ? 'yes' : 'no'}`,
  `- Max report age (hours): ${report.maxAgeHours}`,
  `- Launch ready: ${report.launchReady ? 'yes' : 'no'}`,
  `- Edition: single-store online`,
  `- Errors: ${errorCount}`,
  `- Warnings: ${warningCount}`,
  '',
  '## Report freshness',
  ...Object.entries(report.files).map(([key, file]) => `- ${key}: ${file.exists ? `${file.path} (${file.hoursOld == null ? 'unknown age' : `${file.hoursOld}h old`})` : 'missing'}`),
  '',
  '## Issues',
  ...(issues.length ? issues.map((issue) => `- [${issue.severity}] ${issue.key}: ${issue.message}`) : ['- none']),
  '',
].join('\n');

fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(outputMdPath, md);
console.log(`[release-readiness] wrote ${path.relative(root, outputJsonPath)}`);
console.log(`[release-readiness] wrote ${path.relative(root, outputMdPath)}`);

if (strict && !report.launchReady) {
  console.error('[release-readiness] strict mode failed. Resolve errors before sign-off.');
  process.exit(1);
}
