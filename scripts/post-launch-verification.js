const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const defaultStatusPath = path.join(root, 'ops', 'manual-cutover-status.json');
const templatePath = path.join(root, 'ops', 'manual-cutover-status.template.json');
const statusPath = process.env.CUTOVER_STATUS_FILE ? path.resolve(process.env.CUTOVER_STATUS_FILE) : defaultStatusPath;
const reportJsonPath = path.join(root, 'post-launch-verification-report.json');
const reportMdPath = path.join(docsDir, 'post-launch-verification.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getStatusPayload() {
  if (fs.existsSync(statusPath)) {
    return { payload: readJson(statusPath), source: path.relative(root, statusPath), usingTemplate: false };
  }
  return { payload: readJson(templatePath), source: path.relative(root, templatePath), usingTemplate: true };
}

function flattenGroups(payload) {
  if (Array.isArray(payload.items) && payload.items.length) {
    return payload.items.map((item) => ({
      groupName: String(item.groupName || 'ungrouped'),
      ...item,
    }));
  }
  const groups = [
    ['preLaunchChecks', payload.preLaunchChecks || []],
    ['cutoverChecks', payload.cutoverChecks || []],
    ['postLaunchWatch', payload.postLaunchWatch || []],
  ];
  return groups.flatMap(([groupName, items]) => items.map((item) => ({ groupName, ...item })));
}

function countByStatus(items) {
  return items.reduce((acc, item) => {
    const key = String(item.status || 'pending').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

const { payload, source, usingTemplate } = getStatusPayload();
const items = flattenGroups(payload);
const counts = countByStatus(items);
const pending = counts.pending || 0;
const failed = counts.failed || 0;
const passed = counts.passed || 0;
const launchStable = !usingTemplate && failed === 0 && pending === 0 && items.length > 0;

const report = {
  generatedAt: new Date().toISOString(),
  source,
  usingTemplate,
  releaseCandidate: payload.releaseCandidate || 'unknown',
  environment: payload.environment || 'unspecified',
  launchStable,
  counts: {
    passed,
    pending,
    failed,
    total: items.length,
  },
  owners: payload.owners || {},
  window: payload.window || {},
  rollback: payload.rollback || {},
  items,
  notes: payload.notes || [],
};

const md = [
  '# Post-launch verification',
  '',
  `- Generated at: ${report.generatedAt}`,
  `- Source: ${report.source}`,
  `- Using template only: ${report.usingTemplate ? 'yes' : 'no'}`,
  `- Environment: ${report.environment}`,
  `- Release candidate: ${report.releaseCandidate}`,
  `- Launch stable: ${report.launchStable ? 'yes' : 'no'}`,
  '',
  '## Status counts',
  `- Passed: ${passed}`,
  `- Pending: ${pending}`,
  `- Failed: ${failed}`,
  `- Total: ${report.counts.total}`,
  '',
  '## Open items',
  ...items.filter((item) => String(item.status || 'pending').toLowerCase() !== 'passed').map((item) => `- [${item.groupName}] ${item.label}: ${item.status || 'pending'}${item.notes ? ` — ${item.notes}` : ''}`),
  '',
  '## Notes',
  ...(report.notes.length ? report.notes.map((note) => `- ${note}`) : ['- none']),
  '',
].join('\n');

fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(reportMdPath, md);
console.log(`[post-launch] wrote ${path.relative(root, reportJsonPath)}`);
console.log(`[post-launch] wrote ${path.relative(root, reportMdPath)}`);
if (!launchStable) {
  console.log('[post-launch] launch is not fully signed off yet. Complete pending items in ops/manual-cutover-status.json.');
}
