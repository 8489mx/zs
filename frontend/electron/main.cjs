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
      exec('wmic baseboard get serialnumber', (error, stdout, stderr) => {
        if (error) {
          console.error('Error fetching hardware ID:', error);
          // Fallback if wmic fails
          resolve('UNKNOWN-HARDWARE-ID');
          return;
        }
        // Parse the output to get just the serial string
        const lines = stdout.split('\n').map(l => l.trim()).filter(l => l);
        // lines[0] is usually "SerialNumber"
        // lines[1] is the actual serial
        if (lines.length > 1) {
          resolve(lines[1]);
        } else {
          resolve('UNKNOWN-HARDWARE-ID');
        }
      });
    });
  });

  // Wait for backend to be ready before opening window
  await new Promise(resolve => setTimeout(resolve, 3000));

  createWindow();

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
