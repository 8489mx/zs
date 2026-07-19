const fs = require('fs');
const path = require('path');

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
        if (!serverUrl || typeof serverUrl !== 'string' || !serverUrl.startsWith('http')) {
          return { runtimeMode: 'invalid', serverUrl: null, port: 3001 };
        }
      }

      const port = typeof parsed.port === 'number' ? parsed.port : 3001;
      return { runtimeMode: parsed.runtimeMode, serverUrl, port };
    } catch (err) {
      console.error('[ELECTRON] Failed to read or parse runtime.json.', err);
      return { runtimeMode: 'invalid', serverUrl: null, port: 3001 };
    }
  }

  _saveConfig(newConfig) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2), 'utf8');
      this.config = newConfig;
    } catch (err) {
      console.error('[ELECTRON] Failed to write runtime.json.', err);
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
    if (!serverUrl || typeof serverUrl !== 'string' || !serverUrl.startsWith('http')) {
      throw new Error('Invalid server URL');
    }
    this._saveConfig({
      runtimeMode: 'lan_client',
      serverUrl,
      port: port || 3001
    });
  }
}

module.exports = RuntimeConfig;
