import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { brotliCompressSync } from "node:zlib";

async function expectMinimumTargetSize(page: Page) {
  const targetSizes = await page.locator("a:visible, button:visible").evaluateAll(
    (elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") ?? element.textContent,
          height: bounds.height,
          width: bounds.width,
        };
      }),
  );

  expect(targetSizes).not.toEqual([]);
  for (const target of targetSizes) {
    expect.soft(target.width, `${target.label} width`).toBeGreaterThanOrEqual(44);
    expect.soft(target.height, `${target.label} height`).toBeGreaterThanOrEqual(44);
  }
}

test.describe("global shell", () => {
  test("renders the shared landmarks and current route before interaction", async ({
    page,
  }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await skipLink.click();
    await expect(page.getByRole("main")).toBeFocused();

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("link", { name: "VANTA home" })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Home", exact: true }),
    ).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Open Bag" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
  });

  test("contains focus in mutually exclusive narrow disclosures and returns it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuTrigger = page.getByRole("button", { name: "Open menu" });
    const bagTrigger = page
      .getByRole("banner")
      .getByRole("button", { name: "Open Bag" });
    await expect(menuTrigger).toBeVisible();
    await expect(bagTrigger).toBeVisible();

    await menuTrigger.click();
    const menu = page.getByRole("dialog", { name: "Navigation" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(menu.getByRole("button", { name: "Close menu" })).toBeFocused();

    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press("Tab");
      await expect
        .poll(() =>
          page.evaluate(() =>
            Boolean(document.activeElement?.closest("dialog[open]")),
          ),
        )
        .toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(menuTrigger).toBeFocused();

    await bagTrigger.click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toBeVisible();
    await expect(menu).toBeHidden();
    await bag.getByRole("button", { name: "Close Bag" }).click();
    await expect(bag).toBeHidden();
    await expect(bagTrigger).toBeFocused();

    const footerBagTrigger = page
      .getByRole("contentinfo")
      .getByRole("button", { name: "Open Bag" });
    await footerBagTrigger.click();
    await expect(bag).toBeVisible();
    await bag.getByRole("button", { name: "Close Bag" }).click();
    await expect(footerBagTrigger).toBeFocused();
  });

  test("provides accessible responsive, motion, and contrast foundations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/");

    await expectMinimumTargetSize(page);

    await page.getByRole("button", { name: "Open menu" }).click();
    await expectMinimumTargetSize(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test("keeps initial shell scripts and fonts within route budgets", async ({
    page,
  }) => {
    await page.goto("/");

    const resources = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );
    const loadResources = async (urls: string[]) =>
      Promise.all(
        [...new Set(urls)].map(async (url) => {
          const response = await page.request.get(url);
          expect(response.ok(), `${url} loaded successfully`).toBe(true);
          return response.body();
        }),
      );

    const javascriptBodies = await loadResources(
      resources.filter(
        (name) => name.includes("/_next/static/chunks/") && name.endsWith(".js"),
      ),
    );
    const initialJavaScriptBytes = javascriptBodies.reduce(
      (total, body) => total + brotliCompressSync(body).byteLength,
      0,
    );
    expect(initialJavaScriptBytes).toBeLessThanOrEqual(140 * 1024);

    const shellClientBytes = javascriptBodies
      .filter((body) => body.includes("navigation-dialog-title"))
      .reduce(
        (total, body) => total + brotliCompressSync(body).byteLength,
        0,
      );
    expect(shellClientBytes).toBeGreaterThan(0);
    expect(shellClientBytes).toBeLessThanOrEqual(12 * 1024);

    const fontBodies = await loadResources(
      resources.filter(
        (name) =>
          name.includes("/_next/static/media/") && name.includes(".woff2"),
      ),
    );
    const fontBytes = fontBodies.reduce(
      (total, body) => total + body.byteLength,
      0,
    );
    expect(fontBytes).toBeLessThanOrEqual(120 * 1024);
  });

  test("keeps the 320px server-rendered shell navigable without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 640 },
    });
    const page = await context.newPage();

    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const footerNavigation = page.getByRole("navigation", {
      name: "Footer navigation",
    });
    await expect(footerNavigation.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(
      footerNavigation.getByRole("link", { name: "Product" }),
    ).toBeVisible();
    await expect(footerNavigation.getByRole("link", { name: "Synth" })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    await context.close();
  });
});
