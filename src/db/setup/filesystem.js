const fs = require('fs');
const path = require('path');

function mkdirp(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function resolveDbFile() {
  const configuredDbFile = String(process.env.DB_FILE || '').trim();
  return configuredDbFile
    ? (path.isAbsolute(configuredDbFile)
      ? configuredDbFile
      : path.join(__dirname, '..', '..', '..', configuredDbFile))
    : path.join(__dirname, '..', '..', '..', 'data', 'zstore.db');
}

function ensureDbDir(dbFile) {
  const dbDir = path.dirname(dbFile);
  mkdirp(dbDir);
}

function backupCorruptedDb(filePath) {
  const dir = path.dirname(filePath);
  const backupDir = path.join(dir, 'corrupt-backups');
  mkdirp(backupDir);
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  ['', '-wal', '-shm'].forEach((suffix) => {
    const source = `${filePath}${suffix}`;
    if (!fs.existsSync(source)) return;
    const target = path.join(backupDir, `${path.basename(filePath)}.${stamp}${suffix || '.db'}`);
    try { fs.copyFileSync(source, target); } catch (_) {}
    try { fs.rmSync(source, { force: true }); } catch (_) {}
  });
}

module.exports = {
  mkdirp,
  resolveDbFile,
  ensureDbDir,
  backupCorruptedDb,
};
