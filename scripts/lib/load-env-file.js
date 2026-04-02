const fs = require('fs');
const path = require('path');

function resolveEnvFile(root, explicitPath) {
  return path.resolve(root, explicitPath || process.env.PRODUCTION_ENV_FILE || '.env.production');
}

function loadEnvFile(root, explicitPath) {
  const filePath = resolveEnvFile(root, explicitPath);
  if (!fs.existsSync(filePath)) {
    return { filePath, exists: false };
  }
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return { filePath, exists: true };
}

module.exports = {
  loadEnvFile,
  resolveEnvFile,
};
