const { safeJsonParse } = require('./state-store-service/shared');
const { createStateStoreCore } = require('./state-store-service/core');
const { createStateStorePersistence } = require('./state-store-service/persistence');

function createStateStoreService(params) {
  const { db, config, getSetting } = params;
  if (!db) throw new Error('db is required');
  if (!config) throw new Error('config is required');
  if (typeof getSetting !== 'function') throw new Error('getSetting is required');

  const core = createStateStoreCore({ ...params, safeJsonParse });
  const persistence = createStateStorePersistence({ db, config, getSetting, core });

  return {
    safeJsonParse,
    ...core,
    ...persistence,
  };
}

module.exports = {
  createStateStoreService,
};
