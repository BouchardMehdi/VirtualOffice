import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1280, height: 960 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [{
    command: 'node --import tsx ../server/src/index.ts',
    url: 'http://127.0.0.1:4001/api/health',
    reuseExistingServer: false,
    env: { PORT: '4001', CLIENT_ORIGIN: 'http://127.0.0.1:5174' },
  }, {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --mode test',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: { API_PROXY_TARGET: 'http://127.0.0.1:4001' },
  }],
});
