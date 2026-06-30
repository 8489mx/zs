"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
function quoteIdentifier(identifier) {
    return `"${identifier.replace(/"/g, '""')}"`;
}
function isNonNegativeColumnCheck(constraintDef, columnName) {
    const normalized = constraintDef
        .toLowerCase()
        .replace(/"/g, '')
        .replace(/\((0(?:\.0+)?)\)::numeric/g, '0')
        .replace(/\s+/g, ' ');
    return normalized.includes(columnName.toLowerCase()) && /(?:>=\s*0|0\s*<=)/.test(normalized);
}
async function dropNonNegativeColumnCheckConstraints(db, tableName, columnName) {
    const result = await (0, kysely_1.sql) `
    SELECT
      nsp.nspname AS schema_name,
      rel.relname AS table_name,
      con.conname AS constraint_name,
      pg_get_constraintdef(con.oid) AS constraint_def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute attr ON attr.attrelid = rel.oid AND attr.attnum = ANY(con.conkey)
    WHERE con.contype = 'c'
      AND rel.relname = ${tableName}
      AND attr.attname = ${columnName}
  `.execute(db);
    for (const row of result.rows) {
        if (!isNonNegativeColumnCheck(String(row.constraint_def || ''), columnName))
            continue;
        const qualifiedTableName = `${quoteIdentifier(row.schema_name)}.${quoteIdentifier(row.table_name)}`;
        const constraintName = quoteIdentifier(row.constraint_name);
        await kysely_1.sql.raw(`ALTER TABLE ${qualifiedTableName} DROP CONSTRAINT ${constraintName}`).execute(db);
    }
}
exports.migration = {
    up: async (db) => {
        await dropNonNegativeColumnCheckConstraints(db, 'products', 'stock_qty');
        await dropNonNegativeColumnCheckConstraints(db, 'product_location_stock', 'qty');
    },
    down: async (_db) => { },
};
//# sourceMappingURL=1710000014500-drop-remaining-negative-stock-checks.js.map