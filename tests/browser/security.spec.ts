import { expect, type TestInfo, test } from "@playwright/test";

import {
  EDITORIAL_PREVIEW_COOKIE,
  parseExactOrigin,
  signEditorialPreviewSession,
} from "@/src/editorial/preview-policy";
import { RESTRICTIVE_PERMISSIONS_POLICY } from "@/src/security/response-policy";

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(`${JSON.stringify(value, null, 2)}\n`),
    contentType: "application/json",
  });
}

test.describe("production browser security policy", () => {
  test("binds a deployed run to one ready immutable Netlify deployment", async ({
    request,
  }, testInfo) => {
    const deploymentId = String(testInfo.config.metadata.deploymentId);
    const applicationCommit = String(testInfo.config.metadata.applicationCommit);
    if (!/^[a-f0-9]{24}$/u.test(deploymentId)) {
      await attachJson(testInfo, "security-qualification-identity", {
        acceptanceClaim: false,
        applicationCommit,
        deploymentId,
        environment: "local-production-server",
      });
      return;
    }

    const response = await request.get(
      `https://api.netlify.com/api/v1/deploys/${deploymentId}`,
    );
    expect(response.status()).toBe(200);
    const deployment = (await response.json()) as Record<string, unknown>;
    expect(deployment.id).toBe(deploymentId);
    expect(deployment.commit_ref).toBe(applicationCommit);
    expect(deployment.state).toBe("ready");
    await attachJson(testInfo, "security-qualification-identity", {
      applicationCommit,
      deploymentId,
      deployUrl: testInfo.config.metadata.target,
      environment: "immutable-netlify-deployment",
      ready: true,
    });
  });

  test("serves the allowlisted public policy and required security headers", async ({
    page,
  }, testInfo) => {
    const response = await page.goto("/monolith");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    const csp = headers["content-security-policy"];

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self' blob:");
    expect(csp).not.toContain("*");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toBe(RESTRICTIVE_PERMISSIONS_POLICY);
    expect(headers["cross-origin-opener-policy"]).toBeUndefined();
    expect(headers["cross-origin-embedder-policy"]).toBeUndefined();
    if (new URL(String(testInfo.project.use.baseURL)).protocol === "https:") {
      expect(headers["strict-transport-security"]).toMatch(
        /^max-age=31536000(?:; includeSubDomains)?(?:; preload)?$/u,
      );
    }

    await attachJson(testInfo, "public-security-headers", {
      candidate: testInfo.config.metadata,
      headers: {
        contentSecurityPolicy: csp,
        permissionsPolicy: headers["permissions-policy"],
        referrerPolicy: headers["referrer-policy"],
        strictTransportSecurity:
          headers["strict-transport-security"] ?? "local-not-applicable",
        xContentTypeOptions: headers["x-content-type-options"],
        xFrameOptions: headers["x-frame-options"],
      },
    });
  });

  test("restricts Editorial preview framing to the configured exact ancestor chain", async ({
    context,
    page,
  }, testInfo) => {
    const studioOrigin = parseExactOrigin(process.env.SANITY_STUDIO_ORIGIN);
    const presentationOrigin = parseExactOrigin(
      process.env.SANITY_PRESENTATION_ORIGIN,
    );
    const sessionSecret = process.env.EDITORIAL_PREVIEW_SESSION_SECRET;
    expect(studioOrigin).not.toBeNull();
    expect(presentationOrigin).not.toBeNull();
    expect(sessionSecret).toBeTruthy();
    if (!studioOrigin || !presentationOrigin || !sessionSecret) {
      throw new Error("Editorial preview qualification bindings are required");
    }
    const expiresAt = Date.now() + 10 * 60 * 1_000;
    const session = await signEditorialPreviewSession(
      {
        version: 1,
        perspective: ["drafts"],
        studioOrigin,
        expiresAt,
      },
      sessionSecret,
    );
    expect(session).not.toBeNull();
    if (!session) throw new Error("Unable to sign the preview qualification session");

    const baseURL = String(testInfo.project.use.baseURL);
    await context.addCookies([
      {
        expires: expiresAt / 1_000,
        httpOnly: true,
        name: EDITORIAL_PREVIEW_COOKIE,
        sameSite: new URL(baseURL).protocol === "https:" ? "None" : "Lax",
        secure: new URL(baseURL).protocol === "https:",
        url: baseURL,
        value: session,
      },
    ]);

    const response = await page.goto("/monolith");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    const csp = headers["content-security-policy"];
    expect(csp).toContain(
      `frame-ancestors ${presentationOrigin} ${studioOrigin}`,
    );
    expect(csp).toContain("connect-src 'self' blob:");
    expect(csp.match(/frame-ancestors/gu)).toHaveLength(1);
    expect(csp).not.toContain("frame-ancestors *");
    expect(csp).not.toContain("*.sanity.io");
    expect(headers["x-frame-options"]).toBeUndefined();
    expect(headers["cache-control"]).toContain("no-store");
    expect(headers["x-robots-tag"]).toContain("noindex");

    let framedPreviewOrigin = baseURL;
    if (new URL(baseURL).protocol !== "https:") {
      framedPreviewOrigin = "https://preview.example";
      await context.addCookies([
        {
          expires: expiresAt / 1_000,
          httpOnly: true,
          name: EDITORIAL_PREVIEW_COOKIE,
          sameSite: "None",
          secure: true,
          url: framedPreviewOrigin,
          value: session,
        },
      ]);
      await page.route(`${framedPreviewOrigin}/**`, async (route) => {
        const source = new URL(route.request().url());
        const localTarget = new URL(source.pathname + source.search, baseURL);
        const response = await route.fetch({
          headers: {
            ...route.request().headers(),
            cookie: `${EDITORIAL_PREVIEW_COOKIE}=${session}`,
          },
          url: localTarget.href,
        });
        await route.fulfill({ response });
      });
    }

    const previewUrl = new URL("/monolith", framedPreviewOrigin).href;
    const studioHarnessUrl = `${studioOrigin}/presentation-qualification-harness`;
    await page.route(studioHarnessUrl, async (route) => {
      await route.fulfill({
        body: `<!doctype html><iframe id="preview" src="${previewUrl}"></iframe>`,
        contentType: "text/html",
      });
    });
    const sanityShellUrl = `${presentationOrigin}/studio-shell`;
    await page.route(sanityShellUrl, async (route) => {
      await route.fulfill({
        body: `<!doctype html><iframe id="studio" src="${studioHarnessUrl}"></iframe>`,
        contentType: "text/html",
      });
    });
    await page.goto(sanityShellUrl);
    await expect(
      page
        .frameLocator("#studio")
        .frameLocator("#preview")
        .locator("body"),
    ).toContainText("MONOLITH");

    await attachJson(testInfo, "editorial-preview-security-headers", {
      candidate: testInfo.config.metadata,
      contentSecurityPolicy: csp,
      presentationOrigin,
      studioOrigin,
      xFrameOptions: "omitted-for-exact-csp-frame-ancestor",
    });
  });

  test("does not publish or serve browser source maps", async ({ page, request }, testInfo) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const scriptSources = await page
      .locator('script[src*="/_next/static/"]')
      .evaluateAll((scripts) =>
        scripts
          .map((script) => script.getAttribute("src"))
          .filter((source): source is string => source !== null),
      );
    expect(scriptSources.length).toBeGreaterThan(0);

    for (const source of scriptSources) {
      const scriptUrl = new URL(source, response!.url());
      const scriptResponse = await request.get(scriptUrl.href);
      expect(scriptResponse.ok(), scriptUrl.pathname).toBe(true);
      expect(await scriptResponse.text(), scriptUrl.pathname).not.toMatch(
        /\bsourceMappingURL\s*=/u,
      );

      scriptUrl.search = "";
      const sourceMapResponse = await request.get(`${scriptUrl.href}.map`);
      expect(sourceMapResponse.status(), `${scriptUrl.pathname}.map`).toBe(404);
    }

    await attachJson(testInfo, "browser-source-map-check", {
      candidate: testInfo.config.metadata,
      checkedScriptCount: scriptSources.length,
      sourceMapReferences: 0,
      sourceMapResponses: "all-404",
    });
  });
});
