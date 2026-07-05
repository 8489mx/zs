const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/logo_cropped.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Don't show until ready-to-show
  });

  mainWindow.maximize();
  mainWindow.show();

  // In production, we load the built index.html
  // Also load it for local testing if running 'electron .'
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(async () => {
  // Log App Version details for Update Checker & Debugging
  const packageVersion = require('../package.json').version;
  console.log('----------------------------------------');
  console.log(`[ELECTRON] Application started`);
  console.log(`[ELECTRON] app.getVersion(): ${app.getVersion()}`);
  console.log(`[ELECTRON] package.json version: ${packageVersion}`);
  console.log(`[ELECTRON] process.env.APP_MODE: ${process.env.APP_MODE || 'SELF_CONTAINED'}`);
  console.log(`[ELECTRON] Default UpdateCheckUrl (if any): ...`);
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

  // Start the bundled Postgres Server
  const PostgresManager = require('./postgres-manager.cjs');
  const pgManager = new PostgresManager(app.getAppPath(), app.isPackaged);
  
  try {
    await pgManager.setupAndStart();
  } catch (err) {
    console.error('Failed to start Postgres runtime:', err);
    // Continue anyway or show error dialog (for now just log)
  }

  // Start the bundled NestJS backend in offline mode
  const { fork } = require('child_process');
  const backendPath = path.join(
    __dirname.includes('app.asar') ? __dirname.replace('app.asar', 'app.asar.unpacked') : __dirname,
    'backend',
    'dist',
    'main.js'
  );
  
  // Provide environment variables for the backend
  const backendEnv = {
    ...process.env,
    ...pgManager.getEnvironmentVariables(),
    Z_DATA_DIR: app.isPackaged ? path.join(path.dirname(process.execPath), 'data') : path.join(process.cwd(), 'portable_data'),
    PORTABLE_MODE: 'false',
    APP_PORT: '3001',
    APP_HOST: '127.0.0.1',
    APP_MODE: 'SELF_CONTAINED',
    NODE_ENV: 'production',
    SESSION_SECRET: 'portable-session-secret-local-only-1234567890',
    SESSION_CSRF_SECRET: 'portable-csrf-secret-local-only-1234567890',
    // Allow requests from the Electron renderer (file:// origin)
    CORS_ORIGINS: 'http://localhost:3001,http://127.0.0.1:3001,file://',
    ALLOW_SESSION_ID_HEADER: 'true',
  };

  const backendProcess = fork(backendPath, [], {
    env: backendEnv,
    stdio: 'inherit' // pipes backend logs to electron console
  });

  backendProcess.on('error', (err) => {
    console.error('Backend process error:', err);
  });

  // Ensure backend shuts down when Electron closes
  app.on('will-quit', () => {
    if (backendProcess) {
      backendProcess.kill();
    }
    try {
      pgManager.stopServer();
    } catch (err) {
      console.error('Failed to stop postgres on quit', err);
    }
  });

  // Clear any existing PWA/ServiceWorker caches to ensure updates are instantly applied
  try {
    const { session } = require('electron');
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'caches', 'indexdb']
    });
    console.log('Cleared previous PWA and ServiceWorker caches successfully.');
  } catch (err) {
    console.error('Failed to clear caches:', err);
  }

  // Handle IPC for hardware ID
  ipcMain.handle('get-hardware-id', async () => {
    return new Promise((resolve, reject) => {
      // First try to get the MachineGuid from Registry (Very reliable on Windows)
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
        
        // Fallback to wmic baseboard if reg query fails
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

  // Wait for backend to be ready before opening window
  const net = require('net');
  const waitForBackend = () => {
    return new Promise((resolve) => {
      let attempts = 0;
      const ping = () => {
        attempts++;
        if (attempts > 150) { // Max 30 seconds wait
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

  createWindow();

  // Close the splash screen shortly after main window is visible
  setTimeout(() => {
    if (splash && !splash.isDestroyed()) {
      splash.close();
    }
  }, 300);

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
