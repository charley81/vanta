import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("verification scaffold", () => {
  test("renders the server-built route", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("has no automated WCAG A or AA findings", async ({
    page,
  }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
