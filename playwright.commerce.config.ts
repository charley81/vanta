import { defineConfig, devices } from "@playwright/test";

const localPort = 32143;
const localBaseURL = `https://127.0.0.1:${localPort}`;
const browserBagSigningKey = Buffer.alloc(32, 11).toString("base64url");
const suppliedBaseURL = process.env.COMMERCE_QUALIFICATION_BASE_URL?.trim();
const deploymentId = process.env.COMMERCE_QUALIFICATION_DEPLOYMENT_ID?.trim();
const applicationCommit = process.env.COMMERCE_QUALIFICATION_APPLICATION_COMMIT?.trim();

function deployedBaseURL(): string | null {
  if (!suppliedBaseURL) return null;
  const target = new URL(suppliedBaseURL);
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash
  ) {
    throw new Error(
      "COMMERCE_QUALIFICATION_BASE_URL must be an HTTPS origin without credentials, path, query, or fragment",
    );
  }
  if (!deploymentId || !/^[a-f0-9]{24}$/u.test(deploymentId)) {
    throw new Error(
      "COMMERCE_QUALIFICATION_DEPLOYMENT_ID must identify the immutable Netlify deploy",
    );
  }
  if (target.hostname !== `${deploymentId}--vanta-monolith.netlify.app`) {
    throw new Error(
      "COMMERCE_QUALIFICATION_BASE_URL must be this project's immutable deploy-ID URL",
    );
  }
  if (!applicationCommit || !/^[a-f0-9]{40}$/u.test(applicationCommit)) {
    throw new Error(
      "COMMERCE_QUALIFICATION_APPLICATION_COMMIT must be the full deployed commit",
    );
  }
  return target.origin;
}

const remoteBaseURL = deployedBaseURL();
const baseURL = remoteBaseURL ?? localBaseURL;

if (!remoteBaseURL) {
  process.env.BAG_MODE = "first-party-bag";
  process.env.BAG_SIGNING_KEYS = browserBagSigningKey;
  process.env.SANITY_CONTENT_SOURCE = "fixture";
}

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "commerce-boundary.spec.ts",
  outputDir: "artifacts/commerce-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  metadata: {
    applicationCommit: applicationCommit ?? "local-working-tree",
    deploymentId: deploymentId ?? "local-development-server",
    target: baseURL,
  },
  reporter: [
    ["line"],
    [
      "html",
      {
        outputFolder: "artifacts/commerce-playwright",
        open: "never",
      },
    ],
  ],
  use: {
    baseURL,
    ignoreHTTPSErrors: !remoteBaseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: remoteBaseURL ? "deployed-chromium" : "local-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: remoteBaseURL
    ? undefined
    : {
        command:
          process.env.CI || process.env.COMMERCE_USE_EXISTING_BUILD === "true"
            ? "pnpm exec tsx tooling/testing/secure-next-server.ts"
            : "pnpm build && pnpm exec tsx tooling/testing/secure-next-server.ts",
        url: localBaseURL,
        env: {
          ...process.env,
          BAG_MODE: "first-party-bag",
          BAG_SIGNING_KEYS: browserBagSigningKey,
          NEXT_INTERNAL_PORT: "32144",
          PORT: String(localPort),
          SANITY_CONTENT_SOURCE: "fixture",
        },
        ignoreHTTPSErrors: true,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
