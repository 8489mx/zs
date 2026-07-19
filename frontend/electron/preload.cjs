const { contextBridge, ipcRenderer } = require('electron');

let runtimeConfig = { runtimeMode: 'standalone', port: 3001, apiBaseUrl: 'http://127.0.0.1:3001' };
for (const arg of process.argv) {
  if (arg.startsWith('--electron-runtime-config=')) {
    try {
      runtimeConfig = JSON.parse(arg.split('=')[1]);
      if (runtimeConfig.runtimeMode === 'lan_client' && runtimeConfig.serverUrl) {
        runtimeConfig.apiBaseUrl = runtimeConfig.serverUrl;
      } else {
        runtimeConfig.apiBaseUrl = `http://127.0.0.1:${runtimeConfig.port || 3001}`;
      }
    } catch (e) {
      console.error('Failed to parse runtime config from args', e);
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  getHardwareId: () => ipcRenderer.invoke('get-hardware-id')
});

contextBridge.exposeInMainWorld('electronRuntime', {
  config: runtimeConfig,
  getRuntimeConfig: () => ipcRenderer.invoke('get-runtime-config'),
  switchToStandalone: () => ipcRenderer.invoke('switch-to-standalone'),
  switchToLanServer: () => ipcRenderer.invoke('switch-to-lan-server'),
  switchToLanClient: (opts) => ipcRenderer.invoke('switch-to-lan-client', opts),
  testLanServer: (opts) => ipcRenderer.invoke('test-lan-server', opts)
});
