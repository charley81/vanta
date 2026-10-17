import { expect, test } from "@playwright/test";

test.describe("route continuity", () => {
  test("explicit navigation starts at the canonical beginning and focuses the heading", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#chapter-craft").evaluate((heading) => {
      const element = heading as HTMLElement;
      element.tabIndex = -1;
      element.focus();
    });
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" })
      .click();

    await expect(page).toHaveURL(/\/monolith$/);
    await expect(page.locator("#product-heading")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  });

  test("Back restores semantic position and prior route focus", async ({ page }) => {
    await page.goto("/monolith");
    const craft = page.locator("[data-section='craft']");
    await craft.scrollIntoViewIfNeeded();
    await page.locator("#product-craft-heading").evaluate((heading) => {
      const element = heading as HTMLElement;
      element.tabIndex = -1;
      element.focus({ preventScroll: true });
    });

    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Synth" })
      .click();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(page.locator("#synth-heading")).toBeFocused();

    await page.goBack();
    await expect(page).toHaveURL(/\/monolith$/);
    await expect(page.locator("#product-craft-heading")).toBeFocused();
    await expect(craft).toBeInViewport();
  });

  test("Back restores an enhanced Home chapter directly with prior focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const main = page.locator("[data-home-presentation]");
    await expect(main).toHaveAttribute("data-home-presentation", "horizontal");

    const resolutionAction = page.locator("#home-resolution-action");
    await resolutionAction.focus();
    await expect(main).toHaveAttribute(
      "data-home-active-chapter",
      "resolution",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.history.state as {
              __vantaReturnContext?: { focusTarget?: string };
            }).__vantaReturnContext?.focusTarget,
        ),
      )
      .toBe("home-resolution-action");

    // A late enhancement/layout correction may move the passage while the
    // focused resolution action remains visible. Navigation must anchor the
    // Return context to that visible focused section, not the adjacent beat.
    await page.evaluate(() =>
      window.scrollBy({ top: -window.innerHeight / 2, behavior: "instant" }),
    );
    await expect(main).toHaveAttribute("data-home-active-chapter", "craft");
    await expect(resolutionAction).toBeFocused();
    await expect(resolutionAction).toBeInViewport();

    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" })
      .click();
    await expect(page).toHaveURL(/\/monolith$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(main).toHaveAttribute("data-home-presentation", "horizontal");
    await expect(main).toHaveAttribute(
      "data-home-active-chapter",
      "resolution",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.history.state as {
              __vantaReturnContext?: { focusTarget?: string };
            }).__vantaReturnContext?.focusTarget,
        ),
      )
      .toBe("home-resolution-action");
    await expect(resolutionAction).toBeFocused();
    await expect(resolutionAction).toBeInViewport();
  });

  test("fresh explicit Home navigation returns to the opening", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator("#home-resolution-action").focus();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" })
      .click();
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Home" })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#home-heading")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
    await expect(page.locator('[data-home-beat="opening"]')).toBeInViewport();
  });

  test("reload restores Home semantic position without replay", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const main = page.locator("[data-home-presentation]");
    await page.locator("#home-resolution-action").focus();
    await expect(main).toHaveAttribute(
      "data-home-active-chapter",
      "resolution",
    );

    await page.reload();
    await expect(main).toHaveAttribute("data-home-presentation", "horizontal");
    await expect(main).toHaveAttribute(
      "data-home-active-chapter",
      "resolution",
    );
    await expect(page.locator("#home-resolution-action")).toBeFocused();
  });

  test("activating the current route replaces in place at its canonical start", async ({
    page,
  }) => {
    await page.goto("/monolith");
    const historyLength = await page.evaluate(() => window.history.length);
    await page.locator("[data-section='specifications']").scrollIntoViewIfNeeded();

    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" })
      .click();

    await expect(page.locator("#product-heading")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
    expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
  });

  test("Bag intent supersedes an uncommitted route while preserving the source", async ({
    page,
  }) => {
    let releaseNavigation!: () => void;
    let markRequested!: () => void;
    const navigationGate = new Promise<void>(
      (resolve) => (releaseNavigation = resolve),
    );
    const navigationRequested = new Promise<void>(
      (resolve) => (markRequested = resolve),
    );
    await page.route("**/api/bag", (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          item: null,
          subtotal: null,
          expiresAt: null,
        },
      }),
    );
    await page.route("**/synth?*", async (route) => {
      markRequested();
      await navigationGate;
      await route.continue();
    });
    await page.goto("/monolith");
    const sourceSection = page.locator("[data-section='craft']");
    await sourceSection.scrollIntoViewIfNeeded();
    await page.locator("#product-craft-heading").focus();

    const synthLink = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Synth" });
    const routeClick = synthLink.click();
    await navigationRequested;
    await expect(synthLink).toBeFocused();
    const bagTrigger = page
      .getByRole("banner")
      .getByRole("button", { name: /Open Bag/ });
    await bagTrigger.click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toBeVisible();

    releaseNavigation();
    await routeClick;
    await page.waitForTimeout(250);
    await expect(page).toHaveURL(/\/monolith$/);
    await expect(bag).toBeVisible();

    await bag.getByRole("button", { name: "Close Bag" }).click();
    await expect(bag).toBeHidden();
    await expect(bagTrigger).toBeFocused();
    await expect(sourceSection).toBeInViewport();
  });

  test("a newer route intent supersedes an older delayed navigation", async ({
    page,
  }) => {
    let releaseProduct!: () => void;
    const productGate = new Promise<void>(
      (resolve) => (releaseProduct = resolve),
    );
    await page.route("**/monolith?*", async (route) => {
      await productGate;
      await route.continue();
    });
    await page.goto("/");

    const navigation = page.getByRole("navigation", {
      name: "Primary navigation",
    });
    const productLink = navigation.getByRole("link", { name: "Product" });
    const olderIntent = productLink.click();
    await expect(productLink).toBeFocused();
    await navigation.getByRole("link", { name: "Synth" }).click();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(page.locator("#synth-heading")).toBeFocused();

    releaseProduct();
    await olderIntent;
    await page.waitForTimeout(250);
    await expect(page).toHaveURL(/\/synth$/);
    await expect(page.locator("#synth-heading")).toBeFocused();
  });

  test("prefetch leaves route, progression, consent, and runtime resources untouched", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.addInitScript(() => {
      const NativeAudioContext = window.AudioContext;
      let audioContexts = 0;
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: new Proxy(NativeAudioContext, {
          construct(target, argumentsList) {
            audioContexts += 1;
            return Reflect.construct(target, argumentsList, target);
          },
        }),
      });
      Object.defineProperty(window, "__vantaPrefetchProbe", {
        configurable: true,
        value: {
          get audioContexts() {
            return audioContexts;
          },
        },
      });
    });
    await page.goto("/monolith");
    const originalHistoryLength = await page.evaluate(
      () => window.history.length,
    );

    await expect
      .poll(() =>
        requests.some((request) => {
          const url = new URL(request);
          return url.pathname === "/synth" && url.searchParams.has("_rsc");
        }),
      )
      .toBe(true);

    expect(new URL(page.url()).pathname).toBe("/monolith");
    expect(await page.evaluate(() => window.history.length)).toBe(
      originalHistoryLength,
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(requests.some((request) => request.endsWith(".glb"))).toBe(false);
    expect(
      requests.some((request) => /\/api\/bag\/(?:add|remove)/.test(request)),
    ).toBe(false);
    expect(
      await page.evaluate(() => {
        const probe = (
          window as Window & {
            __vantaPrefetchProbe?: { audioContexts: number };
          }
        ).__vantaPrefetchProbe;
        return {
          audioContexts: probe?.audioContexts ?? -1,
          localKeys: Object.keys(localStorage),
          previewProgress: sessionStorage.getItem(
            "vanta:checkout-preview:v1",
          ),
        };
      }),
    ).toEqual({ audioContexts: 0, localKeys: [], previewProgress: null });
  });

  test("same-route intents consume menu and Bag surfaces without stale focus or overlay history", async ({
    page,
  }) => {
    await page.route("**/api/bag", (route) =>
      route.fulfill({
        json: {
          schemaVersion: 1,
          item: null,
          subtotal: null,
          expiresAt: null,
        },
      }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/synth");
    const initialHistoryLength = await page.evaluate(() => window.history.length);

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Navigation" });
    await menu.getByRole("link", { name: "Synth" }).click();
    await expect(menu).toBeHidden();
    await expect(page.locator("#synth-heading")).toBeFocused();
    expect(await page.evaluate(() => window.history.length)).toBe(
      initialHistoryLength,
    );

    await page
      .getByRole("banner")
      .getByRole("button", { name: /Open Bag/ })
      .click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.history.state.__vantaBagDisclosure?.version ?? null,
        ),
      )
      .toBe(1);

    await bag.getByRole("link", { name: "Open MORPH Lab" }).click();
    await expect(bag).toBeHidden();
    await expect(page.locator("#synth-heading")).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(
          () => "__vantaBagDisclosure" in (window.history.state ?? {}),
        ),
      )
      .toBe(false);

    await page.goBack();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(bag).toBeHidden();
    await page.goForward();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(bag).toBeHidden();
  });
});
