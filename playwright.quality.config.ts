import { defineConfig, devices } from "@playwright/test";

const port = 32145;
const baseURL = `http://127.0.0.1:${port}`;
const reportName = process.env.QUALITY_REPORT_NAME?.trim() || "all";

process.env.SANITY_CONTENT_SOURCE = "fixture";

export default defineConfig({
  testDir: "./tests/quality",
  outputDir: `artifacts/quality-${reportName}-results`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ["line"],
    [
      "html",
      {
        outputFolder: `artifacts/quality-${reportName}-playwright`,
        open: "never",
      },
    ],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "accessibility-chromium",
      testMatch: "accessibility.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "critical-chromium",
      testMatch: "browser-journeys.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "critical-firefox",
      testMatch: "browser-journeys.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "critical-webkit",
      testMatch: "browser-journeys.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "critical-mobile-chromium",
      testMatch: "browser-journeys.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "critical-mobile-webkit",
      testMatch: "browser-journeys.spec.ts",
      use: { ...devices["iPhone 15"] },
    },
    {
      name: "fallback-chromium",
      testMatch: "fallback.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      process.env.CI || process.env.QUALITY_USE_EXISTING_BUILD === "true"
        ? `pnpm start --port ${port}`
        : `pnpm build && pnpm start --port ${port}`,
    url: baseURL,
    env: {
      ...process.env,
      SANITY_CONTENT_SOURCE: "fixture",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
