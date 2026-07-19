const fs = require('fs');
const path = require('path');
const RuntimeConfig = require('../runtime-config.cjs');

describe('RuntimeConfig', () => {
  const testDir = path.join(__dirname, 'test-userData');
  const configPath = path.join(testDir, 'runtime.json');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  afterAll(() => {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  it('defaults to standalone when no file exists', () => {
    const config = new RuntimeConfig(testDir).getConfig();
    expect(config.runtimeMode).toBe('standalone');
  });

  it('loads valid standalone config', () => {
    fs.writeFileSync(configPath, JSON.stringify({ runtimeMode: 'standalone' }));
    const config = new RuntimeConfig(testDir).getConfig();
    expect(config.runtimeMode).toBe('standalone');
  });

  it('loads valid lan_server config', () => {
    fs.writeFileSync(configPath, JSON.stringify({ runtimeMode: 'lan_server' }));
    const config = new RuntimeConfig(testDir).getConfig();
    expect(config.runtimeMode).toBe('lan_server');
  });

  it('loads valid lan_client config with serverUrl', () => {
    fs.writeFileSync(configPath, JSON.stringify({ runtimeMode: 'lan_client', serverUrl: 'http://192.168.1.10:3001' }));
    const config = new RuntimeConfig(testDir).getConfig();
    expect(config.runtimeMode).toBe('lan_client');
  });

  it('rejects lan_client config without serverUrl and returns invalid', () => {
    fs.writeFileSync(configPath, JSON.stringify({ runtimeMode: 'lan_client' }));
    const config = new RuntimeConfig(testDir).getConfig();
    expect(config.runtimeMode).toBe('invalid');
  });

  it('rejects malformed JSON and returns invalid without crashing', () => {
    fs.writeFileSync(configPath, '{ invalid json }');
    const config = new RuntimeConfig(testDir).getConfig();
    expect(config.runtimeMode).toBe('invalid');
  });

  it('switchToLanServer changes config', () => {
    const instance = new RuntimeConfig(testDir);
    instance.switchToLanServer();
    expect(instance.getConfig().runtimeMode).toBe('lan_server');
    const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(saved.runtimeMode).toBe('lan_server');
  });

  it('switchToLanClient requires valid URL', () => {
    const instance = new RuntimeConfig(testDir);
    expect(() => instance.switchToLanClient('invalid-url')).toThrow();
    expect(() => instance.switchToLanClient('http://10.0.0.1:3001')).not.toThrow();
    expect(instance.getConfig().runtimeMode).toBe('lan_client');
  });
});
