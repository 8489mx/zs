const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const templatePath = path.join(root, 'ops', 'manual-cutover-status.template.json');
const defaultStatusPath = path.join(root, 'ops', 'manual-cutover-status.json');
const statusPath = process.env.CUTOVER_STATUS_FILE ? path.resolve(process.env.CUTOVER_STATUS_FILE) : defaultStatusPath;
const strict = process.env.CUTOVER_STATUS_STRICT === 'true';
const outputJsonPath = path.join(root, 'cutover-status-validation-report.json');
const outputMdPath = path.join(docsDir, 'cutover-status-validation.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function pushIssue(collection, severity, key, message) {
  collection.push({ severity, key, message });
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateItems(items, groupKey, issues) {
  const allowedStatuses = new Set(['pending', 'passed', 'failed']);
  const seenKeys = new Set();
  let passed = 0;
  let pending = 0;
  let failed = 0;

  for (const item of Array.isArray(items) ? items : []) {
    const status = String(item?.status || 'pending').trim().toLowerCase();
    if (!nonEmptyString(item?.key)) pushIssue(issues, 'error', `${groupKey}.missing_key`, `Item in ${groupKey} is missing a key.`);
    if (!nonEmptyString(item?.label)) pushIssue(issues, 'error', `${groupKey}.missing_label`, `Item ${item?.key || '<unknown>'} in ${groupKey} is missing a label.`);
    if (!allowedStatuses.has(status)) pushIssue(issues, 'error', `${groupKey}.invalid_status`, `Item ${item?.key || '<unknown>'} in ${groupKey} has invalid status ${JSON.stringify(item?.status)}.`);
    if (nonEmptyString(item?.key)) {
      if (seenKeys.has(item.key)) pushIssue(issues, 'error', `${groupKey}.duplicate_key`, `Duplicate key ${item.key} found in ${groupKey}.`);
      seenKeys.add(item.key);
    }
    if ((status === 'failed' || status === 'pending') && !nonEmptyString(item?.notes)) {
      pushIssue(issues, 'warning', `${groupKey}.missing_notes`, `Item ${item?.key || '<unknown>'} in ${groupKey} should include notes when status is ${status}.`);
    }
    if (status === 'passed') passed += 1;
    if (status === 'pending') pending += 1;
    if (status === 'failed') failed += 1;
  }

  return {
    total: Array.isArray(items) ? items.length : 0,
    passed,
    pending,
    failed,
  };
}


function normalizeGroups(payload) {
  const groupedItems = Array.isArray(payload?.items) ? payload.items : [];
  const pick = (groupKey) => {
    if (Array.isArray(payload?.[groupKey])) return payload[groupKey];
    return groupedItems.filter((item) => String(item?.groupName || '').trim() === groupKey);
  };
  return {
    preLaunchChecks: pick('preLaunchChecks'),
    cutoverChecks: pick('cutoverChecks'),
    postLaunchWatch: pick('postLaunchWatch'),
  };
}

const usingTemplate = !fs.existsSync(statusPath);
const sourcePath = usingTemplate ? templatePath : statusPath;
const payload = readJson(sourcePath);
const issues = [];

if (!nonEmptyString(payload.environment) || payload.environment === 'staging-or-production') {
  pushIssue(issues, usingTemplate ? 'warning' : 'error', 'environment', 'Environment must be set to a real deployment target.');
}

if (!nonEmptyString(payload.releaseCandidate)) {
  pushIssue(issues, 'error', 'releaseCandidate', 'Release candidate is required.');
}

if (!nonEmptyString(payload.timezone)) {
  pushIssue(issues, 'warning', 'timezone', 'Timezone should be set explicitly.');
}

for (const ownerKey of ['releaseManager', 'techOwner', 'rollbackOwner', 'businessApprover']) {
  if (!nonEmptyString(payload?.owners?.[ownerKey])) {
    pushIssue(issues, usingTemplate ? 'warning' : 'error', `owners.${ownerKey}`, `Owner field ${ownerKey} must be filled before launch.`);
  }
}

if (!nonEmptyString(payload?.window?.start) || !nonEmptyString(payload?.window?.end)) {
  pushIssue(issues, usingTemplate ? 'warning' : 'error', 'window', 'Cutover window start and end must be recorded.');
}

if (!nonEmptyString(payload?.rollback?.trigger) || !nonEmptyString(payload?.rollback?.decisionOwner)) {
  pushIssue(issues, usingTemplate ? 'warning' : 'error', 'rollback', 'Rollback trigger and decision owner must be filled before launch.');
}

const groups = normalizeGroups(payload);

const summaries = {
  preLaunchChecks: validateItems(groups.preLaunchChecks, 'preLaunchChecks', issues),
  cutoverChecks: validateItems(groups.cutoverChecks, 'cutoverChecks', issues),
  postLaunchWatch: validateItems(groups.postLaunchWatch, 'postLaunchWatch', issues),
};

const counts = issues.reduce((acc, issue) => {
  acc[issue.severity] = (acc[issue.severity] || 0) + 1;
  return acc;
}, { error: 0, warning: 0 });

const readyForLaunch = !usingTemplate && counts.error === 0;
const report = {
  generatedAt: new Date().toISOString(),
  strict,
  usingTemplate,
  source: path.relative(root, sourcePath),
  readyForLaunch,
  counts,
  summaries,
  issues,
};

const md = [
  '# Cutover status validation',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Source: ${report.source}`,
  `- Using template only: ${report.usingTemplate ? 'yes' : 'no'}`,
  `- Ready for launch: ${report.readyForLaunch ? 'yes' : 'no'}`,
  `- Errors: ${report.counts.error}`,
  `- Warnings: ${report.counts.warning}`,
  '',
  '## Group summaries',
  ...Object.entries(report.summaries).map(([groupKey, summary]) => `- ${groupKey}: ${summary.passed} passed / ${summary.pending} pending / ${summary.failed} failed / ${summary.total} total`),
  '',
  '## Issues',
  ...(report.issues.length ? report.issues.map((issue) => `- [${issue.severity}] ${issue.key}: ${issue.message}`) : ['- none']),
  '',
].join('\n');

fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(outputMdPath, md);
console.log(`[cutover-status] wrote ${path.relative(root, outputJsonPath)}`);
console.log(`[cutover-status] wrote ${path.relative(root, outputMdPath)}`);

if (strict && !readyForLaunch) {
  console.error('[cutover-status] strict mode requires a filled ops/manual-cutover-status.json with no validation errors.');
  process.exit(1);
}
