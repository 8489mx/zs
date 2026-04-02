const path = require('path');

const port = Number(process.env.E2E_PORT || 4010);
const dbFile = path.join(__dirname, '.e2e', 'zstore-e2e.db');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './tests',
  testMatch: ['e2e.spec.js'],
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome',
    headless: process.env.PLAYWRIGHT_HEADED === 'true' ? false : true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'node src/server.js',
    url: `http://127.0.0.1:${port}/api/health`,
    timeout: 120000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DB_FILE: dbFile,
      DEFAULT_ADMIN_USERNAME: 'admin',
      DEFAULT_ADMIN_PASSWORD: 'AdminPass123!',
      SESSION_SECRET: 'playwright-e2e-secret-not-for-production',
      REQUEST_LOGGING: 'false',
      ALLOW_LEGACY_STATE_WRITE: 'false',
      NODE_ENV: 'test',
      SINGLE_STORE_MODE: 'true',
    },
  },
};
