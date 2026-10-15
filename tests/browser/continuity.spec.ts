import { expect, test } from "@playwright/test";

test.describe("route continuity", () => {
  test("explicit navigation starts at the canonical beginning and focuses the heading", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-chapter='craft']").scrollIntoViewIfNeeded();
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
});
