const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const releaseAuditPath = path.join(root, 'release-audit-report.json');
const regressionPath = path.join(root, 'final-regression-report.json');
const routeSweepPath = path.join(root, 'frontend', 'route-live-sweep-report.json');
const outputJsonPath = path.join(root, 'release-closeout-report.json');
const outputMdPath = path.join(docsDir, 'release-closeout-summary.md');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required report: ${path.relative(root, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function allPassed(report) {
  return Array.isArray(report?.steps) && report.steps.every((step) => step.status === 'passed');
}

function summarizeSteps(report) {
  return (report.steps || []).map((step) => ({
    label: step.label,
    status: step.status,
    reason: step.reason || null,
    code: step.code || null,
  }));
}

function extractRouteEntries(routeSweep) {
  if (Array.isArray(routeSweep)) return routeSweep;
  if (Array.isArray(routeSweep?.routes)) return routeSweep.routes;
  return [];
}

function buildRouteSummary(routeSweep) {
  const routes = extractRouteEntries(routeSweep);
  const routeCandidates = routes.filter((route) => route.hasRoutes || route.hasIndexRoute);
  return {
    checkedFeatures: routes.length,
    routedFeatures: routeCandidates.length,
    failingRoutes: routeCandidates.filter((route) => route.hasRoutes === false && route.hasIndexRoute === false).map((route) => route.feature || route.path),
  };
}

const releaseAudit = readJson(releaseAuditPath);
const finalRegression = readJson(regressionPath);
const routeSweep = fs.existsSync(routeSweepPath) ? readJson(routeSweepPath) : [];

const strictReady = releaseAudit.strict === true && finalRegression.strict === true;
const automatedChecksPassed = allPassed(releaseAudit) && allPassed(finalRegression);
const routeSummary = buildRouteSummary(routeSweep);
const launchReady = strictReady && automatedChecksPassed && routeSummary.failingRoutes.length === 0;

const report = {
  generatedAt: new Date().toISOString(),
  launchReady,
  strictReady,
  automatedChecksPassed,
  routeSummary,
  releaseAudit: {
    generatedAt: releaseAudit.generatedAt,
    steps: summarizeSteps(releaseAudit),
  },
  finalRegression: {
    generatedAt: finalRegression.generatedAt,
    steps: summarizeSteps(finalRegression),
  },
  manualChecklist: [
    'Run one admin login and one cashier login against the deployed build.',
    'Post one real sale, one purchase, one stock adjustment, and one stock transfer in staging.',
    'Export, verify, and restore a fresh backup in a safe environment.',
    'Confirm rollback owner, rollback trigger, and rollback window before go-live.',
    'Generate and distribute the cutover pack before the go-live window.'
  ],
  cutoverPackPath: 'cutover-pack/',
};

const md = [
  '# Release closeout summary',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Launch ready: ${report.launchReady ? 'yes' : 'no'}`,
  `- Strict automated checks: ${report.strictReady ? 'yes' : 'no'}`,
  `- Automated checks passed: ${report.automatedChecksPassed ? 'yes' : 'no'}`,
  `- Checked features: ${report.routeSummary.checkedFeatures}`,
  `- Routed features: ${report.routeSummary.routedFeatures}`,
  `- Failing routes: ${report.routeSummary.failingRoutes.length ? report.routeSummary.failingRoutes.join(', ') : 'none'}`,
  '',
  '## Release audit',
  ...report.releaseAudit.steps.map((step) => `- ${step.label}: ${step.status}${step.reason ? ` (${step.reason})` : ''}`),
  '',
  '## Final regression',
  ...report.finalRegression.steps.map((step) => `- ${step.label}: ${step.status}${step.reason ? ` (${step.reason})` : ''}`),
  '',
  '## Manual checklist still required',
  ...report.manualChecklist.map((item) => `- ${item}`),
  '',
  '## Cutover pack',
  `- Path: ${report.cutoverPackPath}`,
  '',
].join('\n');

fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(outputMdPath, md);
console.log(`[release-closeout] wrote ${path.relative(root, outputJsonPath)}`);
console.log(`[release-closeout] wrote ${path.relative(root, outputMdPath)}`);
