import { expect, test } from "@playwright/test";

import {
  emptyBag,
  fulfillJson,
  populatedBag,
} from "./helpers";

test.describe("material fallback qualification", () => {
  test("keeps every Core route useful when JavaScript is disabled", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { height: 720, width: 320 },
    });
    const page = await context.newPage();

    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Sound, given mass." }),
    ).toBeVisible();
    await expect(page.locator("[data-chapter]")).toHaveCount(9);
    await expect(
      page.getByRole("link", { name: "EXPLORE MONOLITH" }),
    ).toBeVisible();

    await page.goto("/monolith");
    await expect(
      page.getByRole("heading", { level: 1, name: "MONOLITH" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Add to Bag is unavailable without JavaScript/).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "TRY MORPH LAB" })).toBeVisible();

    await page.goto("/synth");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "One gesture. Endless change.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/Interactive sound, Realtime, and control changes require JavaScript/),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "EXPLORE MONOLITH" }),
    ).toBeVisible();

    await page.goto("/checkout-preview");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Checkout Preview requires JavaScript.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/No order was placed and no information was collected/),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to MONOLITH" }),
    ).toBeVisible();

    await context.close();
  });

  test("preserves Product truth and actions when representative media requests fail", async ({
    page,
  }, testInfo) => {
    const failedMedia: string[] = [];
    await page.route(
      /\/media\/stills\/product-(?:hero|morph)-.*\.(?:avif|webp)$/u,
      async (route) => {
        failedMedia.push(route.request().url());
        await route.abort("failed");
      },
    );
    await page.goto("/monolith");

    await expect(
      page.getByRole("heading", { level: 1, name: "MONOLITH" }),
    ).toBeVisible();
    await expect(page.getByText("$2,499 USD")).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Add MONOLITH to Bag" }).first(),
    ).toBeEnabled();
    await expect(page.getByRole("link", { name: "TRY MORPH LAB" })).toBeVisible();
    expect(failedMedia.length).toBeGreaterThan(0);

    await testInfo.attach("representative-content-failure", {
      body: Buffer.from(
        JSON.stringify(
          {
            failedRequestCount: failedMedia.length,
            preserved: ["product truth", "price", "Bag action", "Synth exit"],
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
  });

  test("keeps a Bag add failure local and recovers only through Retry", async ({
    page,
  }) => {
    let attempts = 0;
    await page.route("**/api/bag", (route) => fulfillJson(route, emptyBag));
    await page.route("**/api/bag/add", (route) => {
      attempts += 1;
      return attempts === 1
        ? fulfillJson(
            route,
            {
              error: {
                code: "bag_disabled",
                message: "Bag is temporarily unavailable.",
              },
            },
            503,
          )
        : fulfillJson(route, populatedBag);
    });
    await page.goto("/monolith");

    await page
      .getByRole("button", { name: "Add MONOLITH to Bag" })
      .first()
      .click();
    await expect(page.getByRole("alert").first()).toContainText(
      "Bag is temporarily unavailable.",
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "MONOLITH" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Bag" })).toBeHidden();

    await page.getByRole("button", { name: "Retry", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Bag" })).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Bag" }).getByText("Graphite / Quantity 1"),
    ).toBeVisible();
    expect(attempts).toBe(2);
  });

  test("retains authored Home and Synth controls when WebGL is unavailable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const nativeGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        contextId: string,
        options?: unknown,
      ) {
        if (contextId === "webgl2") return null;
        return Reflect.apply(nativeGetContext, this, [contextId, options]);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    const modelRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith(".glb")) modelRequests.push(request.url());
    });

    await page.goto("/");
    await expect(page.locator("main")).toHaveAttribute(
      "data-home-realtime-fallback",
      "capability",
    );
    await expect(
      page.getByRole("link", { name: "EXPLORE MONOLITH" }),
    ).toBeVisible();
    expect(modelRequests).toEqual([]);

    await page.goto("/synth");
    await expect(page.locator("[data-realtime-status]")).toContainText(
      "Interactive view is unavailable in this browser.",
    );
    await page.locator('[data-control-selector="morph"]').click();
    const range = page.getByRole("slider", { name: "MORPH value" });
    await range.fill("73");
    await expect(range).toHaveValue("73");
    await expect(page.getByRole("button", { name: "Enable Sound" })).toBeEnabled();
    expect(modelRequests).toEqual([]);
  });

  test("contains model network failure without affecting controls or sound", async ({
    page,
  }) => {
    await page.route("**/*.glb", (route) => route.abort("failed"));
    await page.goto("/synth");

    await page
      .getByRole("button", { name: "Load interactive instrument view" })
      .click();
    await expect(page.locator('[data-realtime-phase="fallback"]')).toBeVisible();
    await expect(page.locator("[data-realtime-status]")).toContainText(
      "Controls and sound remain available below",
    );
    await page.locator('[data-control-selector="release"]').click();
    await page.getByRole("slider", { name: "RELEASE value" }).fill("68");
    await expect(
      page.locator('[data-control-selector="release"]'),
    ).toHaveAccessibleName("Open RELEASE control, current value 68 percent");
    await expect(page.getByRole("button", { name: "Enable Sound" })).toBeEnabled();
  });

  test("reports suspended audio without losing state or resuming automatically", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const NativeAudioContext = window.AudioContext;
      class ObservableAudioContext extends NativeAudioContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          Object.defineProperty(window, "__qualityAudioContext", {
            configurable: true,
            value: this,
          });
        }
      }
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: ObservableAudioContext,
      });
    });
    await page.goto("/synth");
    await page.locator('[data-control-selector="drive"]').click();
    await page.getByRole("slider", { name: "DRIVE value" }).fill("81");
    await page.getByRole("button", { name: "Enable Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toBeVisible();

    await page.evaluate(async () => {
      await (
        window as Window & { __qualityAudioContext?: AudioContext }
      ).__qualityAudioContext?.suspend();
    });
    await expect(page.locator('[data-audio-state="interrupted"]')).toContainText(
      "will not resume automatically",
    );
    await expect(page.getByRole("slider", { name: "DRIVE value" })).toHaveValue(
      "81",
    );

    await page.getByRole("button", { name: "Resume Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toBeVisible();
  });

  test("rejects malformed Preview storage and history state", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("vanta:checkout-preview:v1", "{not-json");
    });
    await page.route("**/api/bag", (route) => fulfillJson(route, populatedBag));
    await page.goto("/checkout-preview");

    await expect(
      page.getByRole("heading", { level: 1, name: "Contact" }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Review", exact: true }),
    ).toBeDisabled();

    await page.evaluate(() => {
      window.history.replaceState(
        {
          ...window.history.state,
          __vantaCheckoutPreview: { depth: 99, stage: "terminal", version: 99 },
        },
        "",
        window.location.href,
      );
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: window.history.state }),
      );
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Contact" }),
    ).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.history.state.__vantaCheckoutPreview?.stage,
        ),
      )
      .toBe("contact");
  });
});
