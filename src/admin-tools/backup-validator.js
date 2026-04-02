const { normalizeBackupPayload } = require('./shared');
const { validateManifest } = require('./backup-validator/manifest');
const { validateRelationalSnapshot } = require('./backup-validator/relational');
const { validateLegacyAppState } = require('./backup-validator/app-state');
const { countOf, createMessageCollectors, requireArrayOfObjects } = require('./backup-validator/utils');

function verifyBackupPayload(rawPayload) {
  const payload = normalizeBackupPayload(rawPayload);
  const warnings = [];
  const errors = [];
  const { pushUniqueError, pushUniqueWarning } = createMessageCollectors(errors, warnings);
  const formatVersion = Number(payload.formatVersion || 1);

  const relationalTables = payload.snapshot && payload.snapshot.tables && typeof payload.snapshot.tables === 'object' && !Array.isArray(payload.snapshot.tables)
    ? payload.snapshot.tables
    : null;
  const metadataManifest = payload && payload.metadata && payload.metadata.manifest && typeof payload.metadata.manifest === 'object'
    ? payload.metadata.manifest
    : null;

  if (!payload.app_state || typeof payload.app_state !== 'object' || Array.isArray(payload.app_state)) {
    errors.push('Backup file is missing app_state');
  }
  if (formatVersion > 5) warnings.push('Backup format is newer than the current server target (5)');
  if (!Array.isArray(payload.settings)) warnings.push('settings array is missing');
  if (Array.isArray(payload.users) && payload.users.some((u) => u && (u.password_hash || u.password_salt))) {
    warnings.push('Backup contains credential hashes and should only be restored in controlled environments');
  }

  requireArrayOfObjects(payload.users, 'users', errors);
  validateManifest({ relationalTables, metadataManifest, pushUniqueError, pushUniqueWarning });

  if (relationalTables) {
    validateRelationalSnapshot(relationalTables, errors, pushUniqueError, pushUniqueWarning);
  } else {
    validateLegacyAppState(payload, pushUniqueError);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      formatVersion,
      exportedAt: payload.exportedAt || null,
      counts: {
        settings: countOf(payload.settings),
        users: countOf(payload.users),
        purchases: countOf(payload.purchases),
        expenses: countOf(payload.expenses),
        supplierPayments: countOf(payload.supplierPayments),
        returns: countOf(payload.returns),
        services: countOf(payload.services),
        customerLedger: countOf(payload.customerLedger),
        supplierLedger: countOf(payload.supplierLedger),
      },
    },
  };
}

module.exports = { verifyBackupPayload };
