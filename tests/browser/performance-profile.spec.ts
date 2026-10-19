import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const thresholds = {
  cls: 0.1,
  lcpMs: 2_500,
  responseMs: 200,
  ttfbMs: 800,
} as const;

const routes = ["/", "/monolith", "/synth", "/checkout-preview"] as const;

type RouteProfile = {
  route: (typeof routes)[number];
  cls: number;
  lcpMs: number;
  responseMs: number;
  ttfbMs: number;
};

type ProfileIssue = {
  code: string;
  message: string;
  path: string;
};

function git(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

test("profiles every primary route and verifies practical Realtime outcomes", async ({
  browser,
}) => {
  const profiles: RouteProfile[] = [];
  const issues: ProfileIssue[] = [];
  let realtime: Record<string, unknown> = {};
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    const measurements = { cls: 0, lcpMs: 0 };
    Object.defineProperty(window, "__vantaRouteProfile", {
      configurable: true,
      value: measurements,
    });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        measurements.lcpMs = entry.startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!shift.hadRecentInput) measurements.cls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const page = await context.newPage();

  try {
    for (const route of routes) {
      await page.goto(route, { waitUntil: "load" });
      await expect(page.getByRole("main")).toBeVisible();
      await page.waitForTimeout(250);

      const heading = page.getByRole("heading", { level: 1 });
      await heading.evaluate((element) => {
        element.addEventListener(
          "click",
          (event) => {
            Object.defineProperty(window, "__vantaInputDelay", {
              configurable: true,
              value: performance.now() - event.timeStamp,
            });
          },
          { once: true },
        );
      });
      const headingBox = await heading.boundingBox();
      if (!headingBox) throw new Error(`Unable to locate the ${route} heading.`);
      await page.mouse.click(
        headingBox.x + headingBox.width / 2,
        headingBox.y + headingBox.height / 2,
      );
      const responseMs = await page.evaluate(
        () =>
          (window as Window & { __vantaInputDelay?: number })
            .__vantaInputDelay ?? Number.POSITIVE_INFINITY,
      );
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined;
        const measured = (
          window as Window & {
            __vantaRouteProfile?: { cls: number; lcpMs: number };
          }
        ).__vantaRouteProfile;
        return {
          cls: measured?.cls ?? 0,
          lcpMs: measured?.lcpMs ?? 0,
          ttfbMs: navigation?.responseStart ?? Number.POSITIVE_INFINITY,
        };
      });
      const profile = { route, responseMs, ...metrics };
      profiles.push(profile);
      if (profile.lcpMs <= 0) {
        issues.push({
          code: "lcp_unavailable",
          message: `${route} produced no Largest Contentful Paint entry`,
          path: `routes.${route}.lcp`,
        });
      }

      for (const [metric, actual, ceiling] of [
        ["lcp", profile.lcpMs, thresholds.lcpMs],
        ["cls", profile.cls, thresholds.cls],
        ["ttfb", profile.ttfbMs, thresholds.ttfbMs],
        ["response", profile.responseMs, thresholds.responseMs],
      ] as const) {
        if (actual <= ceiling) continue;
        issues.push({
          code: `${metric}_budget_exceeded`,
          message: `${route} measured ${actual} against a ${ceiling} ceiling`,
          path: `routes.${route}.${metric}`,
        });
      }
    }

    await page.goto("/");
    const main = page.getByRole("main");
    await expect(main).toHaveAttribute(
      "data-home-realtime-phase",
      /ready|fallback/,
      { timeout: 10_000 },
    );
    const phase = await main.getAttribute("data-home-realtime-phase");
    const fallbackReason = await main.getAttribute("data-home-realtime-fallback");
    const authoredFallbackVisible = await page
      .locator('[data-authored-media="home-poster"] img')
      .isVisible();
    const realtimeUseful =
      phase === "ready" &&
      (await page.locator("[data-home-realtime-stage]").getAttribute("data-frame")) ===
        "ready";
    if (!realtimeUseful && !authoredFallbackVisible) {
      issues.push({
        code: "realtime_has_no_useful_outcome",
        message: "Home Realtime neither became useful nor retained its authored fallback.",
        path: "realtime.home",
      });
    }
    realtime = {
      authoredFallbackVisible,
      fallbackReason,
      phase,
      useful: realtimeUseful,
    };
  } catch (error) {
    issues.push({
      code: "profile_execution_failed",
      message: error instanceof Error ? error.message : "Production profile failed",
      path: "$",
    });
    throw error;
  } finally {
    await context.close();
    const report = {
      schemaVersion: 1,
      checkId: "production-route-profile",
      status: issues.length === 0 ? "pass" : "fail",
      acceptanceClaim: false,
      command:
        "pnpm exec playwright test tests/browser/performance-profile.spec.ts",
      source: {
        buildId: readFileSync(".next/BUILD_ID", "utf8").trim(),
        commit: git(["rev-parse", "HEAD"]),
        dirty: git(["status", "--porcelain"]) !== "",
      },
      environment: {
        browser: "chromium",
        profile: "1440x900 local production build",
      },
      thresholds,
      routes: profiles,
      realtime,
      issues,
    };
    mkdirSync("artifacts/reports", { recursive: true });
    writeFileSync(
      "artifacts/reports/production-route-profile.json",
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
  }

  expect(issues).toEqual([]);
});
