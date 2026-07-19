const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const RuntimeConfig = require('./runtime-config.cjs');
let runtimeConfigInstance = null;
let currentConfig = null;

let mainWindow = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/logo_cropped.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: [`--electron-runtime-config=${JSON.stringify(currentConfig)}`]
    },
    show: false,
  });

  mainWindow.maximize();
  mainWindow.show();

  // Load loading page immediately while backend starts
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
};

const loadApp = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
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

  // Log App Version details for Update Checker & Debugging
  const packageVersion = require('../package.json').version;
  console.log('----------------------------------------');
  console.log(`[ELECTRON] Application started`);
  console.log(`[ELECTRON] app.getVersion(): ${app.getVersion()}`);
  console.log(`[ELECTRON] package.json version: ${packageVersion}`);
  console.log(`[ELECTRON] process.env.APP_MODE: ${process.env.APP_MODE || 'SELF_CONTAINED'}`);
  console.log('----------------------------------------');

  // Show Splash Screen Immediately
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, '../public/logo_cropped.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
  splash.center();

  // Show main window with loading page immediately (user sees progress)
  createWindow();

  // Close splash shortly after main window is visible
  setTimeout(() => {
    if (splash && !splash.isDestroyed()) {
      splash.close();
    }
  }, 800);

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

  // Check if migrations can be skipped (same version = no new migrations)
  const versionMarkerPath = path.join(dataDir, '.last_migrated_version');
  let skipMigrations = false;
  try {
    if (fsLib.existsSync(versionMarkerPath)) {
      const lastVersion = fsLib.readFileSync(versionMarkerPath, 'utf8').trim();
      if (lastVersion === packageVersion) {
        skipMigrations = true;
        console.log(`[ELECTRON] Skipping migrations (version ${packageVersion} already migrated)`);
      }
    }
  } catch (err) {
    console.error('Error reading version marker:', err);
  }

  // Provide environment variables for the backend
  const backendEnv = {
    ...process.env,
    ...pgManager.getEnvironmentVariables(),
    Z_DATA_DIR: dataDir,
    PORTABLE_MODE: 'false',
    APP_PORT: '3001',
    APP_HOST: currentConfig.runtimeMode === 'lan_server' ? '0.0.0.0' : '127.0.0.1',
    APP_MODE: 'SELF_CONTAINED',
    NODE_ENV: 'production',
    SESSION_SECRET: sessionSecret,
    SESSION_CSRF_SECRET: csrfSecret,
    CORS_ORIGINS: 'http://localhost:3001,http://127.0.0.1:3001,file://',
    ALLOW_SESSION_ID_HEADER: 'true',
    ELECTRON_EXE_PATH: process.execPath,
    SKIP_MIGRATIONS: skipMigrations ? 'true' : 'false',
    ELECTRON_RUNTIME_MODE: currentConfig.runtimeMode,
  };

  let backendProcess = null;
  let isQuitting = false;

  if (currentConfig.runtimeMode !== 'lan_client' && currentConfig.runtimeMode !== 'invalid') {
    backendProcess = fork(backendPath, [], {
      env: backendEnv,
      stdio: 'inherit'
    });

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
  ipcMain.handle('switch-to-standalone', () => {
    runtimeConfigInstance.switchToStandalone();
    app.relaunch();
    app.exit();
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
      return { ok: false, error: err.message };
    }
  });

  // Handle IPC for hardware ID
  ipcMain.handle('get-hardware-id', async () => {
    return new Promise((resolve, reject) => {
      exec('reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', (err1, std1) => {
        if (!err1 && std1 && std1.includes('REG_SZ')) {
          const parts = std1.split('REG_SZ');
          if (parts.length > 1) {
            const guid = parts[1].trim();
            if (guid.length > 10) {
              return resolve(guid.toUpperCase());
            }
          }
        }
        
        exec('wmic baseboard get serialnumber', (error, stdout, stderr) => {
          if (error) {
            console.error('Error fetching hardware ID:', error);
            resolve('UNKNOWN-HARDWARE-ID');
            return;
          }
          const lines = stdout.split('\n').map(l => l.trim()).filter(l => l);
          if (lines.length > 1 && lines[1].toLowerCase() !== 'default string') {
            resolve(lines[1]);
          } else {
            resolve('UNKNOWN-HARDWARE-ID');
          }
        });
      });
    });
  });

  // Wait for backend to be ready then load the actual app
  const net = require('net');
  const waitForBackend = () => {
    if (currentConfig.runtimeMode === 'lan_client' || currentConfig.runtimeMode === 'invalid') return Promise.resolve();
    return new Promise((resolve) => {
      let attempts = 0;
      const ping = () => {
        attempts++;
        if (attempts > 150) {
          return resolve(); 
        }
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => {
          socket.destroy();
          resolve();
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

  await waitForBackend();

  // Write version marker after successful startup (migrations ran or were skipped)
  try {
    if (!fsLib.existsSync(dataDir)) {
      fsLib.mkdirSync(dataDir, { recursive: true });
    }
    fsLib.writeFileSync(versionMarkerPath, packageVersion, 'utf8');
  } catch (err) {
    console.error('Error writing version marker:', err);
  }

  // Load the actual app now that backend is ready
  if (currentConfig.runtimeMode === 'invalid') {
    mainWindow.loadFile(path.join(__dirname, 'config-error.html'));
  } else {
    loadApp();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
