#!/usr/bin/env node
// Customer-release gate: real filesystem behavior, not a PostgreSQL or EXE E2E.
// Run with Node 22 on Windows as well as Linux.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const RuntimeConfig = require('../frontend/electron/runtime-config.cjs');

function withUserData(run) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'zs-electron-customer-'));
  try { return run(folder); }
  finally { fs.rmSync(folder, { recursive: true, force: true }); }
}

test('offline Electron starts standalone and persists that mode across relaunch', () =>
  withUserData((folder) => {
    const config = new RuntimeConfig(folder);
    assert.equal(config.getConfig().runtimeMode, 'standalone');
    config.switchToLanServer();
    assert.equal(new RuntimeConfig(folder).getConfig().runtimeMode, 'lan_server');
    config.switchToStandalone();
    const relaunched = new RuntimeConfig(folder);
    assert.deepEqual(relaunched.getConfig(), { runtimeMode: 'standalone', serverUrl: null, port: 3001 });
    assert.equal(fs.existsSync(path.join(folder, 'runtime.json.tmp')), false);
  }));

test('failed offline config replacement retains last valid config on disk and in memory', () =>
  withUserData((folder) => {
    const config = new RuntimeConfig(folder);
    config.switchToStandalone();
    const before = fs.readFileSync(path.join(folder, 'runtime.json'), 'utf8');
    const savedRename = fs.renameSync;
    try {
      fs.renameSync = () => { throw new Error('simulated locked or full filesystem'); };
      assert.throws(() => config.switchToLanServer(), /Failed to persist runtime.json/);
    } finally {
      fs.renameSync = savedRename;
    }
    assert.equal(config.getConfig().runtimeMode, 'standalone');
    assert.equal(fs.readFileSync(path.join(folder, 'runtime.json'), 'utf8'), before);
    assert.equal(new RuntimeConfig(folder).getConfig().runtimeMode, 'standalone');
    assert.equal(fs.existsSync(path.join(folder, 'runtime.json.tmp')), false);
  }));

test('invalid restored runtime mode and malformed JSON fail closed', () =>
  withUserData((folder) => {
    const file = path.join(folder, 'runtime.json');
    fs.writeFileSync(file, '{bad', 'utf8');
    assert.equal(new RuntimeConfig(folder).getConfig().runtimeMode, 'invalid');
    fs.writeFileSync(file, JSON.stringify({ runtimeMode: 'lan_client', serverUrl: 'https://remote.example.invalid' }));
    assert.equal(new RuntimeConfig(folder).getConfig().runtimeMode, 'invalid');
    const fresh = new RuntimeConfig(folder);
    assert.throws(() => fresh.switchToLanClient('http://name:secret@127.0.0.1:3001'));
  }));
