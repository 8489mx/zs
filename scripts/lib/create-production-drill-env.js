const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function createProductionDrillEnv() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zsystems-prod-drill-'));
  const envFile = path.join(tempRoot, '.env.production.drill');
  const envLines = [
    'NODE_ENV=production',
    'HOST=0.0.0.0',
    'PORT=3000',
    'DB_FILE=data/zstore.db',
    `SESSION_SECRET=${crypto.randomBytes(48).toString('hex')}`,
    'ALLOWED_ORIGINS=https://pilot.zsystems.example',
    'COOKIE_SECURE=true',
    'ENFORCE_SAME_ORIGIN_WRITES=true',
    'TRUST_PROXY=1',
    'REQUEST_LOGGING=true',
    'LOG_LEVEL=info',
    'LOG_FORMAT=plain',
    'HEALTH_EXPOSE_DETAILS=false',
    'ALLOW_RESET_USERS=false',
    'ALLOW_RESTORE_USERS=false',
    'ALLOW_LEGACY_STATE_WRITE=false',
    'USE_LEGACY_FRONTEND_FALLBACK=false',
    'SINGLE_STORE_MODE=true',
    'DEFAULT_ADMIN_USERNAME=ZS',
    'DEFAULT_ADMIN_PASSWORD=',
    'MIN_ADMIN_PASSWORD_LENGTH=10',
    'SESSION_DAYS=7',
    'MAX_FAILED_LOGIN_ATTEMPTS=5',
    'LOGIN_LOCK_MINUTES=15',
    'SUPPORT_SNAPSHOT_LIMIT=20',
    'STORE_NAME=Z Systems',
  ];
  fs.writeFileSync(envFile, `${envLines.join('\n')}\n`);
  return {
    tempRoot,
    envFile,
    env: { PRODUCTION_ENV_FILE: envFile },
    cleanup() {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    },
  };
}

module.exports = {
  createProductionDrillEnv,
};
