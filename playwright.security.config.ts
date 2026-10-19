import { defineConfig, devices } from "@playwright/test";

const localPort = 32146;
const localBaseURL = `http://127.0.0.1:${localPort}`;
const localPreviewSecret = "security-preview-session-secret-32-characters";
const suppliedBaseURL = process.env.SECURITY_QUALIFICATION_BASE_URL?.trim();
const deploymentId = process.env.SECURITY_QUALIFICATION_DEPLOYMENT_ID?.trim();
const applicationCommit =
  process.env.SECURITY_QUALIFICATION_APPLICATION_COMMIT?.trim();

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
      "SECURITY_QUALIFICATION_BASE_URL must be an HTTPS origin without credentials, path, query, or fragment",
    );
  }
  if (!deploymentId || !/^[a-f0-9]{24}$/u.test(deploymentId)) {
    throw new Error(
      "SECURITY_QUALIFICATION_DEPLOYMENT_ID must identify the immutable Netlify deploy",
    );
  }
  if (target.hostname !== `${deploymentId}--vanta-monolith.netlify.app`) {
    throw new Error(
      "SECURITY_QUALIFICATION_BASE_URL must be this project's immutable deploy-ID URL",
    );
  }
  if (!applicationCommit || !/^[a-f0-9]{40}$/u.test(applicationCommit)) {
    throw new Error(
      "SECURITY_QUALIFICATION_APPLICATION_COMMIT must be the full deployed commit",
    );
  }
  return target.origin;
}

const remoteBaseURL = deployedBaseURL();
const baseURL = remoteBaseURL ?? localBaseURL;

if (!remoteBaseURL) {
  process.env.EDITORIAL_PREVIEW_SESSION_SECRET = localPreviewSecret;
  process.env.SANITY_CONTENT_SOURCE = "fixture";
  process.env.SANITY_PRESENTATION_ORIGIN = "https://presentation.example";
  process.env.SANITY_STUDIO_ORIGIN = "https://studio.example";
}

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "security.spec.ts",
  outputDir: "artifacts/security-results",
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
        outputFolder: "artifacts/security-playwright",
        open: "never",
      },
    ],
  ],
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
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
          process.env.CI || process.env.SECURITY_USE_EXISTING_BUILD === "true"
            ? `pnpm start --port ${localPort}`
            : `pnpm build && pnpm start --port ${localPort}`,
        url: localBaseURL,
        env: {
          ...process.env,
          EDITORIAL_PREVIEW_SESSION_SECRET: localPreviewSecret,
          SANITY_CONTENT_SOURCE: "fixture",
          SANITY_PRESENTATION_ORIGIN: "https://presentation.example",
          SANITY_STUDIO_ORIGIN: "https://studio.example",
        },
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
