const path = require('path');
const {
  collectFileChecks,
  collectPackageChecks,
  collectConfigChecks,
  collectSourceChecks,
} = require('./checks');

function analyzeLaunchGate(input = {}) {
  const config = input.config || {};
  const projectRoot = input.projectRoot || path.join(__dirname, '..', '..');
  const findings = [];

  collectFileChecks({ findings, projectRoot });
  collectPackageChecks({ findings, projectRoot });
  collectConfigChecks({ findings, config });
  collectSourceChecks({ findings, projectRoot });

  return {
    ok: !findings.some((item) => item.severity === 'error'),
    findings,
  };
}

module.exports = { analyzeLaunchGate };
