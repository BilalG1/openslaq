import { defineConfig } from "@playwright/test";

const prefix = process.env.PORT_PREFIX || "30";
const webPort = parseInt(`${prefix}00`);
const apiPort = parseInt(`${prefix}01`);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 4,
  retries: 0,
  timeout: 20_000,
  reporter: "html",
  globalSetup: "./global-setup.ts",
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "bun --env-file=../../.env run --hot src/index.ts",
      cwd: "../api",
      port: apiPort,
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
      port: webPort,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
