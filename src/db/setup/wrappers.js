function normalizeRows(value) {
  if (Array.isArray(value)) return value.map((row) => (row && typeof row === 'object' ? { ...row } : row));
  if (value && typeof value === 'object') return { ...value };
  return value;
}

function normalizeBindArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

function createStatement(stmt) {
  return {
    run(...args) {
      return stmt.run(...normalizeBindArgs(args));
    },
    get(...args) {
      return normalizeRows(stmt.get(...normalizeBindArgs(args)));
    },
    all(...args) {
      return normalizeRows(stmt.all(...normalizeBindArgs(args)));
    },
    iterate(...args) {
      return stmt.iterate(...normalizeBindArgs(args));
    },
    columns() {
      return stmt.columns();
    },
    get expandedSQL() {
      return stmt.expandedSQL;
    },
    get sourceSQL() {
      return stmt.sourceSQL;
    },
  };
}

function createDbFacade(rawDb) {
  return {
    prepare(sql) {
      return createStatement(rawDb.prepare(sql));
    },
    exec(sql) {
      return rawDb.exec(sql);
    },
    pragma(statement) {
      const text = String(statement || '').trim();
      if (!text) return null;
      const query = /^\s*pragma\s+/i.test(text) ? text : `PRAGMA ${text}`;
      return rawDb.exec(query);
    },
    transaction(fn) {
      return (...args) => {
        rawDb.exec('BEGIN IMMEDIATE');
        try {
          const result = fn(...args);
          rawDb.exec('COMMIT');
          return result;
        } catch (error) {
          try { rawDb.exec('ROLLBACK'); } catch (_) {}
          throw error;
        }
      };
    },
    close() {
      return rawDb.close();
    },
    __raw: rawDb,
  };
}

module.exports = { createDbFacade };
