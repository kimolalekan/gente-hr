import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (Playwright).
 *
 *   pnpm test:e2e          # run all e2e tests
 *   pnpm test:e2e:ui       # interactive UI runner
 *
 * Requirements: Postgres running (DATABASE_URL in .env.local). The global
 * setup applies migrations + seeds, and the config boots the Next dev server
 * (or reuses one already running on :3000).
 *
 * Uses the system Chrome by default (the bundled Chromium download is blocked
 * in this environment); override the channel with PW_CHANNEL.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // The suite shares one seeded database and several tests mutate rows, so
  // tests within a file run sequentially (files still run in parallel).
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use the system Chrome by default: the bundled Chromium download
        // is blocked in this environment. Override with PW_CHANNEL
        // (e.g. `PW_CHANNEL=msedge pnpm test:e2e`).
        ...(process.env.PW_CHANNEL
          ? { channel: process.env.PW_CHANNEL }
          : { channel: "chrome" }),
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
