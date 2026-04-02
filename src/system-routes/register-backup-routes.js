const { getRateLimitKey } = require('../request-context');

function registerBackupRoutes({
  app,
  authMiddleware,
  adminOnly,
  requirePermission,
  requireAnyPermission,
  backupSnapshotStore,
  buildRelationalBackupPayload,
  backupDownloadRateLimit,
  backupVerifyRateLimit,
  verifyBackupPayload,
  restoreRateLimit,
  backupRestoreService,
  respondError,
}) {
  app.get('/api/backup-snapshots', authMiddleware, adminOnly, requirePermission('canManageBackups'), (req, res) => {
    const snapshots = backupSnapshotStore.listSnapshots();
    res.json({ snapshots });
  });

  app.get('/api/backup', authMiddleware, adminOnly, requireAnyPermission(['canManageBackups']), (req, res) => {
    const rate = backupDownloadRateLimit(getRateLimitKey(req, 'backup-download', req.user?.id));
    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many backup downloads. Try again later.' });
    }
    const payload = buildRelationalBackupPayload();
    backupSnapshotStore.createSnapshot(payload, { source: 'manual', label: `Manual backup ${new Date().toISOString()}` });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="z-systems-backup-v5.json"');
    res.send(JSON.stringify(payload, null, 2));
  });

  app.post('/api/backup/verify', authMiddleware, adminOnly, requireAnyPermission(['canManageBackups']), (req, res) => {
    const rate = backupVerifyRateLimit(getRateLimitKey(req, 'backup-verify', req.user?.id));
    if (!rate.allowed) {
      return res.status(429).json({ error: 'Too many backup verification attempts. Try again later.' });
    }
    try {
      res.json(verifyBackupPayload(req.body || {}));
    } catch (err) {
      respondError(res, err, 'Could not verify backup');
    }
  });

  app.post('/api/backup/restore', authMiddleware, adminOnly, requireAnyPermission(['canManageBackups']), (req, res) => {
    try {
      const rate = restoreRateLimit(getRateLimitKey(req, 'restore', req.user?.id));
      if (!rate.allowed) {
        return res.status(429).json({ error: 'Too many restore attempts. Try again later.' });
      }
      const payload = req.body || {};
      const isRelationalSnapshot = !!(payload && payload.snapshot && payload.snapshot.tables && typeof payload.snapshot.tables === 'object' && !Array.isArray(payload.snapshot.tables));
      if (!payload.app_state && !isRelationalSnapshot) return res.status(400).json({ error: 'Backup file is invalid' });
      if (payload.formatVersion && Number(payload.formatVersion) > 5) return res.status(400).json({ error: 'Backup format is newer than this server supports' });
      const dryRun = String((req.query || {}).dryRun || '').toLowerCase() === 'true';
      const restoreResult = backupRestoreService.restoreBackupPayload(payload, req.user.id, { dryRun });
      res.json({ ok: true, ...restoreResult });
    } catch (err) {
      respondError(res, err, 'Could not restore backup');
    }
  });
}

module.exports = {
  registerBackupRoutes,
};
