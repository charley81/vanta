import { defineConfig, devices } from "@playwright/test";

const port = 32142;
const baseURL = `http://127.0.0.1:${port}`;
const browserPreviewSecret = "browser-preview-session-secret-32-characters";

process.env.EDITORIAL_PREVIEW_SESSION_SECRET = browserPreviewSecret;
process.env.SANITY_STUDIO_ORIGIN = "https://studio.example";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "artifacts/test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["line"],
    ["html", { outputFolder: "artifacts/playwright", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `pnpm start --port ${port}`
      : `pnpm build && pnpm start --port ${port}`,
    url: baseURL,
    env: {
      ...process.env,
      EDITORIAL_PREVIEW_SESSION_SECRET: browserPreviewSecret,
      SANITY_STUDIO_ORIGIN: "https://studio.example",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
