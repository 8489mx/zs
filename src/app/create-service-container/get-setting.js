function createGetSetting({ db }) {
  return function getSetting(key, fallback = '') {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  };
}

module.exports = {
  createGetSetting,
};
