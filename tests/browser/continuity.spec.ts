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
});
