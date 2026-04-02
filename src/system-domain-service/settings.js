const { hashManagerPin } = require('../pin-security');

function createSystemSettingsService({
  db,
  validateSettingsPayload,
  stateWithUsers,
  saveState,
  audit,
}) {
  const { redactSettingsForAudit, writeStructuredAudit } = audit;

  function getSystemSettings() {
    return stateWithUsers().settings;
  }

  function sanitizeSettingsForClient(settings) {
    const safe = { ...(settings || {}) };
    delete safe.managerPin;
    safe.hasManagerPin = Boolean(safe.hasManagerPin);
    return safe;
  }

  function saveSystemSettings(payload, actor) {
    const currentSettings = stateWithUsers().settings || {};
    const validatedSettings = validateSettingsPayload({ ...currentSettings, ...(payload || {}) });
    if (validatedSettings.currentBranchId) {
      const branch = db.prepare('SELECT id FROM branches WHERE id = ? AND is_active = 1').get(Number(validatedSettings.currentBranchId));
      if (!branch) {
        const err = new Error('Selected current branch does not exist');
        err.statusCode = 400;
        throw err;
      }
    }
    if (validatedSettings.currentLocationId) {
      const location = db.prepare('SELECT id, branch_id FROM stock_locations WHERE id = ? AND is_active = 1').get(Number(validatedSettings.currentLocationId));
      if (!location) {
        const err = new Error('Selected current location does not exist');
        err.statusCode = 400;
        throw err;
      }
      if (validatedSettings.currentBranchId && location.branch_id && String(location.branch_id) !== String(Number(validatedSettings.currentBranchId))) {
        const err = new Error('Selected current location does not belong to the selected branch');
        err.statusCode = 400;
        throw err;
      }
    }
    const state = stateWithUsers();
    const beforeSettings = redactSettingsForAudit(sanitizeSettingsForClient(currentSettings));
    const nextSettings = { ...validatedSettings };
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'managerPin')) {
      nextSettings.managerPin = validatedSettings.managerPin ? hashManagerPin(validatedSettings.managerPin) : '';
    }
    state.settings = nextSettings;
    const saved = saveState(state);
    const sanitizedSettings = sanitizeSettingsForClient(saved.settings);
    writeStructuredAudit('تعديل الإعدادات', actor, {
      before: beforeSettings,
      after: redactSettingsForAudit(sanitizedSettings),
    });
    return sanitizedSettings;
  }

  return {
    getSystemSettings: () => sanitizeSettingsForClient(getSystemSettings()),
    saveSystemSettings,
  };
}

module.exports = { createSystemSettingsService };
