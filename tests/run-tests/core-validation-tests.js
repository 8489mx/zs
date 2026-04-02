const assert = require('assert');
const {
  validateSettingsPayload,
  parseDateRange,
  validateUsersPayload,
  validatePasswordChangePayload,
  validateDefaultAdminPassword,
  normalizeOrigin,
} = require('../../src/validation');
const { verifyBackupPayload } = require('../../src/admin-tools');
const { run } = require('./test-harness');

function runCoreValidationTests() {
  run('validateSettingsPayload normalizes values', () => {
    const result = validateSettingsPayload({ storeName: '  Demo  ', lowStockThreshold: '-3', accentColor: '#123456', managerPin: '1234' });
    assert.equal(result.storeName, 'Demo');
    assert.equal(result.lowStockThreshold, 0);
    assert.equal(result.accentColor, '#123456');
    assert.equal(result.managerPin, '1234');
  });

  run('validateSettingsPayload rejects invalid manager pin', () => {
    assert.throws(() => validateSettingsPayload({ managerPin: '12ab' }), (err) => err && err.statusCode === 400);
  });

  run('parseDateRange returns ordered range', () => {
    const range = parseDateRange({ from: '2026-03-01T00:00:00.000Z', to: '2026-03-27T00:00:00.000Z' });
    assert.ok(new Date(range.from).getTime() <= new Date(range.to).getTime());
  });

  run('validateUsersPayload enforces at least one active admin', () => {
    assert.throws(() => validateUsersPayload([{ username: 'cash', role: 'cashier', isActive: true }]), (err) => err && err.statusCode === 400);
  });

  run('validateUsersPayload sanitizes users', () => {
    const users = validateUsersPayload([{ username: ' admin ', role: 'admin', permissions: ['sales', ''], isActive: true }]);
    assert.equal(users[0].username, 'admin');
    assert.equal(users[0].role, 'admin');
    assert.deepEqual(users[0].permissions, ['sales']);
  });

  run('validatePasswordChangePayload enforces configurable minimum length', () => {
    const payload = validatePasswordChangePayload({ currentPassword: 'oldpass', newPassword: '1234567890' }, 10);
    assert.equal(payload.currentPassword, 'oldpass');
    assert.equal(payload.newPassword, '1234567890');
    assert.throws(() => validatePasswordChangePayload({ currentPassword: 'oldpass', newPassword: '123456789' }, 10), /at least 10 characters/);
    assert.throws(() => validatePasswordChangePayload({ currentPassword: 'oldpass', newPassword: '123' }, 8), /at least 8 characters/);
  });

  assert.equal(validateDefaultAdminPassword('', 10), '');
  assert.equal(validateDefaultAdminPassword('1234567890', 10), '1234567890');
  assert.throws(() => validateDefaultAdminPassword('12345', 10), /at least 10 characters/i);
  assert.equal(normalizeOrigin('https://example.com/'), 'https://example.com');
  assert.equal(normalizeOrigin('HTTPS://EXAMPLE.COM'), 'https://example.com');

  const verified = verifyBackupPayload({ formatVersion: 4, app_state: {}, settings: [], users: [] });
  assert.equal(verified.ok, true);
  assert.equal(verified.summary.formatVersion, 4);
  const badBackup = verifyBackupPayload({ formatVersion: 5 });
  assert.equal(badBackup.ok, false);
  assert.ok(Array.isArray(badBackup.errors));
  assert.ok(Array.isArray(badBackup.warnings));
}

module.exports = {
  runCoreValidationTests,
};
