const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

function run(name, fn) {
  try {
    fn();
    console.log(`OK ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const projectRoot = path.join(__dirname, '..');

run('demo data scripts and sample files exist', () => {
  assert.equal(fs.existsSync(path.join(projectRoot, 'scripts', 'seed-demo.js')), true);
  assert.equal(fs.existsSync(path.join(projectRoot, 'scripts', 'reset-demo.js')), true);
  assert.equal(fs.existsSync(path.join(projectRoot, 'demo', 'products-demo.csv')), true);
  assert.equal(fs.existsSync(path.join(projectRoot, 'demo', 'customers-demo.csv')), true);
  assert.equal(fs.existsSync(path.join(projectRoot, 'demo', 'suppliers-demo.csv')), true);
  assert.equal(fs.existsSync(path.join(projectRoot, 'demo', 'opening-stock-demo.csv')), true);
  assert.equal(fs.existsSync(path.join(projectRoot, 'docs', 'demo-data-pack.md')), true);
});

run('seed demo script populates a temp database', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zsystems-seed-'));
  const dbFile = path.join(tempDir, 'demo.db');
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'seed-demo.js'), '--fresh', '--force', '--quiet', '--db-file', dbFile], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'seed-demo.js failed');
  }
  assert.equal(fs.existsSync(dbFile), true);
  const db = new DatabaseSync(dbFile);
  const counts = {
    users: Number(db.prepare('SELECT COUNT(*) AS total FROM users').get().total || 0),
    branches: Number(db.prepare('SELECT COUNT(*) AS total FROM branches').get().total || 0),
    locations: Number(db.prepare('SELECT COUNT(*) AS total FROM stock_locations').get().total || 0),
    products: Number(db.prepare('SELECT COUNT(*) AS total FROM products').get().total || 0),
    customers: Number(db.prepare('SELECT COUNT(*) AS total FROM customers').get().total || 0),
    suppliers: Number(db.prepare('SELECT COUNT(*) AS total FROM suppliers').get().total || 0),
    sales: Number(db.prepare('SELECT COUNT(*) AS total FROM sales').get().total || 0),
    purchases: Number(db.prepare('SELECT COUNT(*) AS total FROM purchases').get().total || 0),
    returns: Number(db.prepare('SELECT COUNT(*) AS total FROM returns').get().total || 0),
  };
  db.close();
  assert.ok(counts.users >= 3);
  assert.ok(counts.branches >= 2);
  assert.ok(counts.locations >= 3);
  assert.ok(counts.products >= 10);
  assert.ok(counts.customers >= 5);
  assert.ok(counts.suppliers >= 4);
  assert.ok(counts.sales >= 3);
  assert.ok(counts.purchases >= 4);
  assert.ok(counts.returns >= 2);
});

if (process.exitCode) process.exit(process.exitCode);
console.log('Demo data pack tests passed');
