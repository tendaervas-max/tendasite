import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', {open:'never',outputFolder:'playwright-report'}]],
  use: { baseURL: 'http://127.0.0.1:4173', trace:'retain-on-failure', screenshot:'only-on-failure' },
  projects: [
    { name:'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport:{width:1440,height:900} } },
    { name:'mobile-chromium', use: { ...devices['iPhone 13'], browserName:'chromium' } }
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'https://mock.supabase.local',
      VITE_SUPABASE_ANON_KEY: 'mock-anon-key-long-enough-for-local-e2e-test-only',
      VITE_MERCADOPAGO_ATIVO: 'false'
    }
  }
});
