const { hashManagerPin, verifyManagerPin } = require('../pin-security');

function createAssertManagerPin({ db, getSetting }) {
  return function assertManagerPin(pin) {
    const configuredHash = String(getSetting('managerPinHash', '') || '').trim();
    const legacyPin = String(getSetting('managerPin', '') || '').trim();
    const configuredPin = configuredHash || legacyPin;
    if (!configuredPin) throw new Error('Manager PIN is not configured');
    if (!verifyManagerPin(pin, configuredPin)) throw new Error('Invalid manager PIN');
    if (!configuredHash && legacyPin) {
      const upgradedHash = hashManagerPin(legacyPin);
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('managerPinHash', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(upgradedHash);
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('managerPin', '')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run('');
    }
  };
}

module.exports = { createAssertManagerPin };
