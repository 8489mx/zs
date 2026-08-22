const { app, BrowserWindow, ipcMain, dialog, session, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const RuntimeConfig = require('./runtime-config.cjs');
let runtimeConfigInstance = null;
let currentConfig = null;

function getAppDisplayVersion() {
  try {
    const portableRoot = path.dirname(process.execPath);
    const versionFile = path.join(portableRoot, 'runtime', 'run', '.app_version');
    if (fs.existsSync(versionFile)) {
      const v = fs.readFileSync(versionFile, 'ascii').trim();
      if (v) return v;
    }
  } catch { /* ignore */ }

  try {
    const unpackedBackendPkg = path.join(
      __dirname.includes('app.asar') ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname,
      'backend/package.json'
    );
    if (fs.existsSync(unpackedBackendPkg)) {
      const pkg = JSON.parse(fs.readFileSync(unpackedBackendPkg, 'utf8'));
      if (pkg.version) return pkg.version;
    }
  } catch { /* ignore */ }

  try {
    return require('../package.json').version;
  } catch {
    return app.getVersion() || '1.0.0';
  }
}

const packageVersion = getAppDisplayVersion();

function getLoadingHtmlPath() {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    return path.join(__dirname, 'loading.html');
  }

  // 1. Check unpacked dist/loading.html (updated via OTA patches)
  const unpackedDistLoading = path.join(
    __dirname.includes('app.asar') ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname,
    '../dist/loading.html'
  );
  if (fs.existsSync(unpackedDistLoading)) {
    return unpackedDistLoading;
  }

  // 2. Check unpacked electron/loading.html
  const unpackedElectronLoading = path.join(
    __dirname.includes('app.asar') ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname,
    'loading.html'
  );
  if (fs.existsSync(unpackedElectronLoading)) {
    return unpackedElectronLoading;
  }

  // 3. Check resources/loading.html
  try {
    const portableRoot = path.dirname(process.execPath);
    const resourcesLoading = path.join(portableRoot, 'resources', 'loading.html');
    if (fs.existsSync(resourcesLoading)) {
      return resourcesLoading;
    }
  } catch { /* ignore */ }

  // 4. Fallback to asar
  return path.join(__dirname, 'loading.html');
}

let loadingWindow = null;
let mainWindow = null;

const createLoadingWindow = () => {
  loadingWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0d1322',
    icon: path.join(__dirname, '../public/logo_cropped.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  loadingWindow.setMenuBarVisibility(false);
  loadingWindow.maximize();
  loadingWindow.show();
  loadingWindow.loadFile(getLoadingHtmlPath(), { query: { v: packageVersion } });
};

const createMainWindow = (onReadyCallback) => {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '../public/logo_cropped.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: [`--electron-runtime-config=${JSON.stringify(currentConfig)}`]
    },
    show: false
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler((details) => {
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-prevent-unload', (event) => {
    mainWindow.webContents.send('show-custom-close-dialog');
  });

  let hasRevealed = false;
  const revealApp = () => {
    if (hasRevealed) return;
    hasRevealed = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.maximize();
      mainWindow.show();
    }
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      setTimeout(() => {
        try {
          if (loadingWindow && !loadingWindow.isDestroyed()) {
            loadingWindow.destroy();
            loadingWindow = null;
          }
        } catch (e) {}
      }, 100);
    }
    if (onReadyCallback) onReadyCallback();
  };

  mainWindow.once('ready-to-show', () => {
    setTimeout(revealApp, 250);
  });

  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(revealApp, 350);
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const unpackedDist = path.join(
      __dirname.includes('app.asar') ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname,
      '../dist/index.html'
    );
    mainWindow.loadFile(unpackedDist);
  }
};

app.whenReady().then(async () => {
  runtimeConfigInstance = new RuntimeConfig(app.getPath('userData'));
  currentConfig = runtimeConfigInstance.getConfig();

  // Find a free port dynamically for the backend (starting from configured port or 3001)
  if (currentConfig.runtimeMode !== 'lan_client') {
    const net = require('net');
    const startPort = currentConfig.port || 3001;
    const findFreePort = (port) => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, '127.0.0.1', () => {
          server.once('close', () => resolve(port));
          server.close();
        });
        server.on('error', () => {
          resolve(findFreePort(port + 1));
        });
      });
    };
    const freePort = await findFreePort(startPort);
    if (freePort !== startPort) {
      console.log(`[ELECTRON] Port ${startPort} is busy. Dynamically assigned port ${freePort} for backend.`);
      currentConfig.port = freePort;
    }
  }

  // Log App Version details for Update Checker & Debugging
  const runtimeVersion = getAppDisplayVersion();
  console.log('----------------------------------------');
  console.log(`[ELECTRON] Application started`);
  console.log(`[ELECTRON] app.getVersion(): ${app.getVersion()}`);
  console.log(`[ELECTRON] runtime version: ${runtimeVersion}`);
  console.log(`[ELECTRON] process.env.APP_MODE: ${process.env.APP_MODE || 'SELF_CONTAINED'}`);
  console.log('----------------------------------------');

  // Clear HTTP Cache on startup to prevent bloat and improve startup time over months of use
  try {
    await session.defaultSession.clearCache();
    console.log('[ELECTRON] Cleared Chromium HTTP Cache successfully.');
  } catch (err) {
    console.error('[ELECTRON] Failed to clear cache:', err);
  }

  // Show loading window with progress immediately
  createLoadingWindow();

  // Start the bundled Postgres Server
  const PostgresManager = require('./postgres-manager.cjs');
  const pgManager = new PostgresManager(app.getAppPath(), app.isPackaged);
  
  if (currentConfig.runtimeMode !== 'lan_client' && currentConfig.runtimeMode !== 'invalid') {
    try {
      await pgManager.setupAndStart();
    } catch (err) {
      console.error('Failed to start Postgres runtime:', err);
    }
  }

  // Start the bundled NestJS backend in offline mode
  const { fork } = require('child_process');
  const backendPath = path.join(
    __dirname.includes('app.asar') ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname,
    'backend',
    'dist',
    'main.js'
  );
  
  // Load or generate session secrets securely
  const fsLib = require('fs');
  const cryptoLib = require('crypto');
  const dataDir = app.isPackaged ? path.join(path.dirname(process.execPath), 'runtime', 'data') : path.join(process.cwd(), 'portable_data');
  const secretsPath = path.join(dataDir, 'secrets.json');
  let sessionSecret, csrfSecret;
  try {
    if (fsLib.existsSync(secretsPath)) {
      const secretsData = JSON.parse(fsLib.readFileSync(secretsPath, 'utf8'));
      sessionSecret = secretsData.sessionSecret;
      csrfSecret = secretsData.csrfSecret;
    }
  } catch (err) {
    console.error('Error reading secrets.json', err);
  }
  if (!sessionSecret || !csrfSecret) {
    sessionSecret = cryptoLib.randomBytes(32).toString('hex');
    csrfSecret = cryptoLib.randomBytes(32).toString('hex');
    try {
      if (!fsLib.existsSync(dataDir)) {
        fsLib.mkdirSync(dataDir, { recursive: true });
      }
      fsLib.writeFileSync(secretsPath, JSON.stringify({ sessionSecret, csrfSecret }), { mode: 0o600 });
    } catch (err) {
      console.error('Error writing secrets.json', err);
    }
  }

  // Always run migrations on startup to handle manual data folder replacements
  const versionMarkerPath = path.join(dataDir, '.last_migrated_version');

  // Provide environment variables for the backend
  const backendEnv = {
    ...process.env,
    ...pgManager.getEnvironmentVariables(),
    Z_DATA_DIR: dataDir,
    PORTABLE_MODE: 'false',
    APP_PORT: String(currentConfig.port || 3001),
    APP_HOST: currentConfig.runtimeMode === 'lan_server' ? '0.0.0.0' : '127.0.0.1',
    APP_MODE: 'SELF_CONTAINED',
    NODE_ENV: 'production',
    SESSION_SECRET: sessionSecret,
    SESSION_CSRF_SECRET: csrfSecret,
    CORS_ORIGINS: `http://localhost:${currentConfig.port || 3001},http://127.0.0.1:${currentConfig.port || 3001},file://`,
    ALLOW_SESSION_ID_HEADER: 'true',
    ELECTRON_EXE_PATH: process.execPath,
    SKIP_MIGRATIONS: 'false',
    ELECTRON_RUNTIME_MODE: currentConfig.runtimeMode,
    DEVELOPER_MASTER_PASSWORD: 'infoadmin',
  };

  let backendProcess = null;
  let isQuitting = false;

  const backendLogPath = path.join(dataDir, '../logs', 'backend.log');
  let backendLogStream = null;
  try {
    if (!fsLib.existsSync(path.dirname(backendLogPath))) {
      fsLib.mkdirSync(path.dirname(backendLogPath), { recursive: true });
    }
    backendLogStream = fsLib.createWriteStream(backendLogPath, { flags: 'a' });
    backendLogStream.write(`\n\n--- Backend Starting at ${new Date().toISOString()} ---\n`);
  } catch (err) {
    console.error('Could not create backend log stream', err);
  }

  let lastBackendError = '';

  if (currentConfig.runtimeMode !== 'lan_client' && currentConfig.runtimeMode !== 'invalid') {
    backendProcess = fork(backendPath, [], {
      env: backendEnv,
      stdio: 'pipe'
    });

    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(text);
        if (backendLogStream) backendLogStream.write(text);
      });
    }

    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(text);
        if (backendLogStream) backendLogStream.write(text);
        // keep last 500 chars for error dialog
        lastBackendError = (lastBackendError + text).slice(-500); 
      });
    }

    backendProcess.on('error', (err) => {
      console.error('Backend process error:', err);
    });

    // When the backend exits cleanly (code 0, no signal), it means it triggered
    // a self-update. Close Electron so ApplyAndRestart.ps1 can replace the files
    // and relaunch the EXE.
    backendProcess.on('exit', (code, signal) => {
      if (code === 0 && !signal && !isQuitting) {
        console.log('[ELECTRON] Backend exited cleanly — closing Electron for update restart...');
        isQuitting = true;
        app.quit();
      } else if (code !== 0 && !isQuitting) {
        console.error(`[ELECTRON] Backend crashed with code ${code} and signal ${signal}`);
        if (backendLogStream) {
          backendLogStream.write(`\n--- Backend crashed with code ${code} ---\n`);
        }
        dialog.showErrorBox(
          'فشل تشغيل السيرفر الداخلي',
          'حدث خطأ غير متوقع أدى إلى توقف السيرفر المحلي. النظام سيعمل الآن في وضع الأوفلاين.\n\n' +
          'السبب المحتمل:\n' +
          lastBackendError.trim() + '\n\n' +
          'للمزيد من التفاصيل، راجع ملف backend.log الموجود في مجلد logs.'
        );
      }
    });
  }

  // Ensure backend shuts down when Electron closes
  app.on('will-quit', () => {
    isQuitting = true;
    if (backendProcess) {
      backendProcess.kill();
    }
    try {
      pgManager.stopServer();
    } catch (err) {
      console.error('Failed to stop postgres on quit', err);
    }
  });

  // Handle IPC for LAN Modes
  ipcMain.handle('get-runtime-config', () => currentConfig);
  ipcMain.on('force-close-app', () => {
    app.exit(0);
  });

  // Handle IPC for Silent Printing
  ipcMain.handle('get-printers', async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const printers = await mainWindow.webContents.getPrintersAsync();
        return printers.map(p => ({ name: p.name, displayName: p.displayName, isDefault: p.isDefault }));
      }
      return [];
    } catch (err) {
      console.error('Failed to get printers', err);
      return [];
    }
  });

  ipcMain.handle('print-html-silent', async (e, { html, deviceName, pageSize }) => {
    return new Promise((resolve) => {
      let printWin = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });
      
      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      
      printWin.webContents.on('did-finish-load', () => {
        // Use a small timeout to allow layout parsing and image loading (if any data URIs)
        setTimeout(() => {
          if (!printWin || printWin.isDestroyed()) {
             return resolve({ ok: false, error: 'Window destroyed' });
          }
          printWin.webContents.print({
            silent: true,
            printBackground: true,
            deviceName: deviceName || undefined,
            margins: { marginType: 'none' },
            pageSize: pageSize === 'receipt' ? { width: 72000, height: 297000 } : (pageSize === 'A4' ? 'A4' : undefined)
          }, (success, failureReason) => {
            if (!printWin.isDestroyed()) {
              printWin.destroy();
            }
            if (success) resolve({ ok: true });
            else resolve({ ok: false, error: failureReason });
          });
        }, 200);
      });
    });
  });
  ipcMain.handle('switch-to-standalone', () => {
    runtimeConfigInstance.switchToStandalone();
    app.relaunch();
    app.exit();
  });

  ipcMain.handle('clear-app-cache', async () => {
    try {
      await session.defaultSession.clearCache();
      return { ok: true };
    } catch (error) {
      console.error('Failed to clear app cache:', error);
      return { ok: false, error: String(error) };
    }
  });

  ipcMain.handle('switch-to-lan-server', () => {
    runtimeConfigInstance.switchToLanServer();
    app.relaunch();
    app.exit();
  });
  ipcMain.handle('switch-to-lan-client', (e, { serverUrl, port }) => {
    runtimeConfigInstance.switchToLanClient(serverUrl, port);
    app.relaunch();
    app.exit();
  });
  ipcMain.handle('test-lan-server', async (e, { serverUrl }) => {
    try {
      const { net: electronNet } = require('electron');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await electronNet.fetch(`${serverUrl}/api/runtime/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Server returned ' + res.status);
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      let errorMsg = err.message || String(err);
      if (err.name === 'AbortError' || errorMsg.includes('aborted')) {
        errorMsg = 'فشل الاتصال: يرجى التأكد من أن البرنامج يعمل على الجهاز الرئيسي، وأنه متصل بنفس الشبكة ولا يمنعه الجدار الناري.';
      } else if (errorMsg.includes('fetch failed')) {
        errorMsg = 'تعذر الاتصال بالجهاز الرئيسي. تأكد من صحة الرابط.';
      }
      return { ok: false, error: errorMsg };
    }
  });

  // Handle License Storage & Hardware ID Resolution
  const getLicenseFilePath = () => path.join(app.getPath('userData'), 'license.json');

  const readLicenseFile = () => {
    try {
      const filePath = getLicenseFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[ELECTRON] Failed to read license.json:', e);
    }
    return null;
  };

  const writeLicenseFile = (data) => {
    try {
      const filePath = getLicenseFilePath();
      const existing = readLicenseFile() || {};
      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('[ELECTRON] Failed to write license.json:', e);
      return false;
    }
  };

  const computeHardwareId = () => {
    return new Promise((resolve) => {
      // 1. Return cached hardwareId if already persisted on this machine
      const cached = readLicenseFile();
      if (cached && cached.hardwareId && typeof cached.hardwareId === 'string' && cached.hardwareId.trim().length > 3) {
        return resolve(cached.hardwareId.trim());
      }

      const isInvalid = (val) => {
        if (!val) return true;
        const lower = val.toLowerCase().trim();
        return lower === '' || 
               lower.includes('default string') || 
               lower.includes('to be filled by o.e.m') || 
               lower.includes('ffffffff') || 
               lower === 'none' ||
               lower === '00000000' ||
               lower === '0000000000000000';
      };

      const cleanStr = (s) => (s || '').replace(/[^A-Za-z0-9_-]/g, '').trim().toUpperCase();

      // 2. Primary on Windows: Physical Hardware Fingerprint (Disk Serial + CPU ID + Motherboard)
      if (process.platform === 'win32') {
        const psScript = `
$disk = (Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue | Select-Object -ExpandProperty SerialNumber -First 1);
$cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessorId -First 1);
$uuid = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).UUID;
$bb = (Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue).SerialNumber;
$mac = (Get-CimInstance Win32_NetworkAdapter -Filter "PhysicalAdapter=True and MACAddress IS NOT NULL" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MACAddress -First 1);
Write-Output "$disk|$cpu|$uuid|$bb|$mac"
`;
        try {
          const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
          exec(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 4500 }, (err, stdout) => {
            let disk = '';
            let cpu = '';
            let uuid = '';
            let bb = '';
            let mac = '';

            if (!err && stdout) {
              const parts = stdout.trim().split('|');
              if (parts.length >= 5) {
                disk = isInvalid(parts[0]) ? '' : cleanStr(parts[0]);
                cpu = isInvalid(parts[1]) ? '' : cleanStr(parts[1]);
                uuid = isInvalid(parts[2]) ? '' : cleanStr(parts[2]);
                bb = isInvalid(parts[3]) ? '' : cleanStr(parts[3]);
                mac = isInvalid(parts[4]) ? '' : cleanStr(parts[4]);
              }
            }

            let generatedHwId = '';
            if (disk && cpu) {
              generatedHwId = `HW-${disk}-${cpu}`;
            } else if (disk) {
              generatedHwId = `DISK-${disk}-${uuid || mac || 'PC'}`;
            } else if (cpu) {
              generatedHwId = `CPU-${cpu}-${uuid || bb || mac || 'PC'}`;
            } else if (uuid && uuid !== '03000200040005000006000700080009') {
              generatedHwId = `UUID-${uuid}-${bb || 'PC'}`;
            } else if (mac) {
              generatedHwId = `MAC-${mac}-PC`;
            } else {
              // Secondary fallback: Windows Registry MachineGuid
              try {
                const regOutput = execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', { encoding: 'utf8', timeout: 1500 });
                const match = regOutput.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
                if (match && match[1] && !isInvalid(match[1])) {
                  generatedHwId = `WIN-${cleanStr(match[1])}`;
                }
              } catch (e) {}

              if (!generatedHwId) {
                const os = require('os');
                generatedHwId = `HOST-${cleanStr(os.hostname())}-${cleanStr(os.userInfo() ? os.userInfo().username : 'USER')}`;
              }
            }

            writeLicenseFile({ hardwareId: generatedHwId });
            resolve(generatedHwId);
          });
          return;
        } catch (e) {
          console.warn('[ELECTRON] Hardware ID PowerShell execution failed:', e);
        }
      }

      // 3. Fallback for non-Windows or if PowerShell completely failed
      try {
        const os = require('os');
        const fallback = `HOST-${cleanStr(os.hostname())}-${cleanStr(os.userInfo() ? os.userInfo().username : 'USER')}`;
        writeLicenseFile({ hardwareId: fallback });
        resolve(fallback);
      } catch (e) {
        const fallback = 'UNKNOWN-HARDWARE-ID';
        writeLicenseFile({ hardwareId: fallback });
        resolve(fallback);
      }
    });
  };

  // Handle IPC for hardware ID & License
  ipcMain.handle('get-hardware-id', async () => {
    return await computeHardwareId();
  });

  ipcMain.handle('get-saved-license', async () => {
    return readLicenseFile();
  });

  ipcMain.handle('save-license-key', async (event, key) => {
    const trimmedKey = (key || '').trim();
    const id = await computeHardwareId();
    writeLicenseFile({ hardwareId: id, licenseKey: trimmedKey, activatedAt: new Date().toISOString() });
    return { ok: true };
  });

  // Wait for backend to be ready then load the actual app
  const net = require('net');
  const waitForBackend = () => {
    if (currentConfig.runtimeMode === 'invalid') return Promise.resolve(false);
    
    if (currentConfig.runtimeMode === 'lan_client') {
      return new Promise((resolve) => {
        const { net: electronNet } = require('electron');
        let attempts = 0;
        const pingLan = async () => {
          attempts++;
          if (attempts > 15) { // wait up to 15 seconds
            return resolve(false); 
          }
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            const res = await electronNet.fetch(`${currentConfig.lanServerUrl}/api/runtime/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) return resolve(true);
          } catch (err) {}
          setTimeout(pingLan, 1000);
        };
        pingLan();
      });
    }

    return new Promise((resolve) => {
      let attempts = 0;
      const ping = () => {
        attempts++;
        if (attempts > 150) {
          return resolve(true); 
        }
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('error', () => {
          socket.destroy();
          setTimeout(ping, 200);
        });
        socket.on('timeout', () => {
          socket.destroy();
          setTimeout(ping, 200);
        });
        socket.connect(3001, '127.0.0.1');
      };
      ping();
    });
  };

  const backendReady = await waitForBackend();

  // Write version marker after successful startup (migrations ran or were skipped)
  try {
    if (!fsLib.existsSync(dataDir)) {
      fsLib.mkdirSync(dataDir, { recursive: true });
    }
    fsLib.writeFileSync(versionMarkerPath, packageVersion, 'utf8');
  } catch (err) {
    console.error('Error writing version marker:', err);
  }

  // Load the actual app now that backend is ready (Seamless Handover)
  if (currentConfig.runtimeMode === 'invalid') {
    createMainWindow((win) => {
      win.loadFile(path.join(__dirname, 'config-error.html'));
    });
  } else if (currentConfig.runtimeMode === 'lan_client' && !backendReady) {
    createMainWindow((win) => {
      win.loadFile(path.join(__dirname, 'server-offline.html'));
    });
  } else {
    createMainWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
