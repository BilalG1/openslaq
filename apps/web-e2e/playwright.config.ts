import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 6,
  retries: 1,
  timeout: 60_000,
  reporter: "html",
  globalSetup: "./global-setup.ts",
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "bun --env-file=../../.env run --hot src/index.ts",
      cwd: "../api",
      port: 3001,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: {
        E2E_TEST_SECRET: "openslaq-e2e-test-secret-do-not-use-in-prod",
        VITE_STACK_PROJECT_ID: "test-project-id",
        ADMIN_USER_IDS: "admin-test-user",
      },
    },
    {
      command: "bun run dev",
      cwd: "../web",
      port: 3000,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: process.env.VITE_COVERAGE ? { VITE_COVERAGE: "true" } : {},
    },
  ],
});
