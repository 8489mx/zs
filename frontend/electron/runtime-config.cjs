const fs = require('fs');
const path = require('path');

function normalizeLanServerUrl(value) {
  if (typeof value !== 'string') throw new Error('Invalid server URL');
  const input = value.trim();
  let url;
  try { url = new URL(input); } catch { throw new Error('Invalid server URL'); }
  if (url.protocol !== 'http:' || !url.hostname || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash ||
      !/^(?:localhost|[a-z0-9.-]+|\[[a-f0-9:]+\])$/i.test(url.hostname)) {
    throw new Error('LAN server must be a plain HTTP host with an optional port');
  }
  return url.origin;
}

class RuntimeConfig {
  constructor(userDataPath) {
    this.configPath = path.join(userDataPath, 'runtime.json');
    this.config = this._loadConfig();
  }

  _loadConfig() {
    const defaultConfig = {
      runtimeMode: 'standalone',
      serverUrl: null,
      port: 3001
    };

    if (!fs.existsSync(this.configPath)) {
      return defaultConfig;
    }

    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      const parsed = JSON.parse(data);

      const validModes = ['standalone', 'lan_server', 'lan_client'];
      if (!validModes.includes(parsed.runtimeMode)) {
        return { runtimeMode: 'invalid', serverUrl: null, port: 3001 };
      }

      let serverUrl = parsed.serverUrl;
      if (parsed.runtimeMode === 'lan_client') {
        try { serverUrl = normalizeLanServerUrl(serverUrl); }
        catch { return { runtimeMode: 'invalid', serverUrl: null, port: 3001 }; }
      }

      const port = Number.isInteger(parsed.port) && parsed.port >= 1024 && parsed.port <= 65535 ? parsed.port : 3001;
      return { runtimeMode: parsed.runtimeMode, serverUrl, port };
    } catch (err) {
      console.error('[ELECTRON] Failed to read or parse runtime.json.', err);
      return { runtimeMode: 'invalid', serverUrl: null, port: 3001 };
    }
  }

  _saveConfig(newConfig) {
    // Never truncate the last known-good offline launch configuration.
    // If a power loss or filesystem error interrupts this write, the old
    // runtime.json must remain readable and the UI must not claim success.
    const temporary = this.configPath + '.tmp';
    try {
      fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFileSync(temporary, JSON.stringify(newConfig, null, 2), 'utf8');
      fs.renameSync(temporary, this.configPath);
      this.config = newConfig;
    } catch (err) {
      try { fs.rmSync(temporary, { force: true }); } catch {}
      throw new Error('[ELECTRON] Failed to persist runtime.json: ' +
        (err instanceof Error ? err.message : String(err)));
    }
  }

  getConfig() {
    return this.config;
  }

  switchToStandalone() {
    this._saveConfig({
      runtimeMode: 'standalone',
      serverUrl: null,
      port: 3001
    });
  }

  switchToLanServer() {
    this._saveConfig({
      runtimeMode: 'lan_server',
      serverUrl: null,
      port: 3001
    });
  }

  switchToLanClient(serverUrl, port) {
    const normalized = normalizeLanServerUrl(serverUrl);
    this._saveConfig({
      runtimeMode: 'lan_client',
      serverUrl: normalized,
      port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : 3001
    });
  }
}

module.exports = RuntimeConfig;
module.exports.normalizeLanServerUrl = normalizeLanServerUrl;
