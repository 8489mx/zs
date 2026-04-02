function createBackupSnapshotStore({ db, getStoredAppState, persistAppStateOnly }) {
  if (!db) throw new Error('db is required');

  const listStmt = db.prepare('SELECT id, created_at, label, source FROM backup_snapshots ORDER BY id DESC LIMIT ?');
  const insertStmt = db.prepare('INSERT INTO backup_snapshots (label, source, payload_json) VALUES (?, ?, ?)');
  const trimStmt = db.prepare('DELETE FROM backup_snapshots WHERE id NOT IN (SELECT id FROM backup_snapshots ORDER BY id DESC LIMIT ?)');
  const countStmt = db.prepare('SELECT COUNT(1) AS total FROM backup_snapshots');

  function mapRow(row) {
    return {
      id: String(row.id),
      createdAt: row.created_at,
      label: row.label || '',
      source: row.source || 'manual',
    };
  }

  function listSnapshots(limit = 10) {
    const rows = listStmt.all(Math.max(1, Math.min(Number(limit || 10), 30)));
    return rows.map(mapRow);
  }

  function createSnapshot(payload, options = {}) {
    const createdAt = new Date().toISOString();
    const label = String(options.label || `Backup ${createdAt}`).slice(0, 120);
    const source = String(options.source || 'manual').slice(0, 40);
    insertStmt.run(label, source, JSON.stringify(payload || {}));
    trimStmt.run(10);
    return { createdAt, label, source };
  }

  function migrateLegacySnapshots() {
    const currentCount = Number(countStmt.get()?.total || 0);
    if (currentCount > 0) return { migrated: 0, skipped: true };
    const legacyState = typeof getStoredAppState === 'function' ? getStoredAppState() : {};
    const legacySnapshots = Array.isArray(legacyState.backupSnapshots) ? legacyState.backupSnapshots : [];
    if (!legacySnapshots.length) return { migrated: 0, skipped: false };
    const limited = legacySnapshots.slice(-10);
    for (const snapshot of limited) {
      const createdAt = snapshot.createdAt || snapshot.date || new Date().toISOString();
      const label = String(snapshot.label || `Legacy backup ${createdAt}`).slice(0, 120);
      const payload = snapshot.payload && typeof snapshot.payload === 'object' ? snapshot.payload : snapshot;
      insertStmt.run(label, 'legacy-import', JSON.stringify(payload || {}));
    }
    trimStmt.run(10);
    if (typeof persistAppStateOnly === 'function') {
      const nextState = { ...(legacyState || {}) };
      delete nextState.backupSnapshots;
      persistAppStateOnly(nextState);
    }
    return { migrated: limited.length, skipped: false };
  }

  return {
    listSnapshots,
    createSnapshot,
    migrateLegacySnapshots,
  };
}

module.exports = { createBackupSnapshotStore };
