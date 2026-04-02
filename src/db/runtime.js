const { resolveDbFile, ensureDbDir } = require('./setup/filesystem');
const { openDatabase } = require('./setup/open');
const { createDbFacade } = require('./setup/wrappers');
const { applyBaseSchema } = require('./setup/schema');

const dbFile = resolveDbFile();
ensureDbDir(dbFile);
const rawDb = openDatabase(dbFile);
const db = createDbFacade(rawDb);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
applyBaseSchema(db);
db.__dbFile = dbFile;

module.exports = db;
