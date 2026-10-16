import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  {
    path: "/",
    heading: "Sound, given mass.",
    title: "VANTA — Sound, given mass.",
  },
  {
    path: "/monolith",
    heading: "MONOLITH",
    title: "MONOLITH — Hybrid Polyphonic Synthesizer | VANTA",
  },
  {
    path: "/synth",
    heading: "One gesture. Endless change.",
    title: "MORPH Lab — Play MONOLITH | VANTA",
  },
  {
    path: "/checkout-preview",
    heading: "Checkout Preview needs a confirmed Bag.",
    title: "Checkout Preview | VANTA",
  },
] as const;

test.describe("Core route walking skeleton", () => {
  for (const route of routes) {
    test(`${route.path} renders useful accessible server content`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 });
      await page.goto(route.path);

      await expect(page).toHaveTitle(route.title);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("renders canonical Home and Product section order", async ({ page }) => {
    await page.goto("/");
    await expect
      .poll(() =>
        page.locator("[data-chapter]").evaluateAll((sections) =>
          sections.map((section) => section.getAttribute("data-chapter")),
        ),
      )
      .toEqual([
        "philosophy",
        "reveal",
        "sub",
        "monolith",
        "morph",
        "gesture",
        "fracture",
        "craft",
        "resolution",
      ]);

    await page.goto("/monolith");
    await expect
      .poll(() =>
        page.locator("[data-section]").evaluateAll((sections) =>
          sections.map((section) => section.getAttribute("data-section")),
        ),
      )
      .toEqual([
        "hero",
        "thesis",
        "sonic",
        "states",
        "morph",
        "craft",
        "specifications",
        "lab-invitation",
        "final-action",
      ]);
    await expect(page.getByRole("main").getByText("$2,499 USD")).toHaveCount(2);
  });

  test("keeps unavailable enhancements explicit and locally contained", async ({ page }) => {
    await page.goto("/monolith");
    await page.getByRole("button", { name: "Add MONOLITH to Bag" }).first().click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Retry", exact: true }).locator(".."),
    ).toContainText("Bag is temporarily unavailable.");
    await expect(page.getByRole("heading", { level: 1, name: "MONOLITH" })).toBeVisible();

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open Bag" })
      .click();
    await expect(bag).toBeVisible();
    await expect(bag.getByText("Bag is temporarily unavailable.")).toBeVisible();
    await bag.getByRole("link", { name: "Open MORPH Lab" }).click();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(bag).toBeHidden();

    await expect(page.getByRole("button", { name: "Enable Sound" })).toBeDisabled();
    await expect(page.getByRole("slider")).toHaveCount(6);
    for (const slider of await page.getByRole("slider").all()) {
      await expect(slider).toBeDisabled();
    }

    await page.goto("/checkout-preview");
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
    await expect(robots).toHaveAttribute("content", /nofollow/);
    await expect(robots).toHaveAttribute("content", /noarchive/);
  });

  test("supports client navigation and reload across route adapters", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" })
      .click();
    await expect(page).toHaveURL(/\/monolith$/);
    await expect(page.getByRole("heading", { level: 1, name: "MONOLITH" })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Synth" })
      .click();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "One gesture. Endless change." }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "One gesture. Endless change." }),
    ).toBeVisible();
  });

  test("keeps Home and Product useful without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sound, given mass." })).toBeVisible();
    await expect(page.locator("[data-chapter]")).toHaveCount(9);
    await expect(page.getByRole("link", { name: "EXPLORE MONOLITH" })).toBeVisible();

    await page.goto("/monolith");
    await expect(page.getByRole("heading", { name: "MONOLITH" })).toBeVisible();
    await expect(page.getByRole("main").getByText("$2,499 USD")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "TRY MORPH LAB" })).toBeVisible();
    await expect(
      page.getByText(/Bag stores one MONOLITH in this browser for up to 30 days/),
    ).toBeVisible();

    await context.close();
  });

  test("keeps Product isolated from heavy route runtimes", async ({ page }) => {
    await page.goto("/monolith");
    const resources = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );

    expect(resources.join("\n")).not.toMatch(
      /three|react-three|decoder|\.glb(?:$|\?)|audio-worklet/i,
    );
  });
});
