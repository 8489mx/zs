function createSystemAuditHelpers({ addAuditLog }) {
  function safeAuditPayload(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function redactSettingsForAudit(settings) {
    if (!settings || typeof settings !== 'object') return settings;
    return {
      ...settings,
      managerPin: settings.managerPin ? '***' : settings.managerPin,
      logoData: settings.logoData ? '[redacted]' : settings.logoData,
    };
  }

  function writeStructuredAudit(action, actor, meta) {
    addAuditLog(action, JSON.stringify(safeAuditPayload({
      actorUserId: Number(actor && actor.id || 0),
      actorRole: String(actor && actor.role || ''),
      ...meta,
    }, meta || {})), actor && actor.id ? Number(actor.id) : null);
  }

  return {
    safeAuditPayload,
    redactSettingsForAudit,
    writeStructuredAudit,
  };
}

module.exports = { createSystemAuditHelpers };
