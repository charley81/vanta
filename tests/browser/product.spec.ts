import AxeBuilder from "@axe-core/playwright";
import { expect, type Route, test } from "@playwright/test";

const populatedBag = {
  schemaVersion: 1,
  item: {
    brand: "VANTA",
    name: "MONOLITH",
    category: "Desktop Synthesizer",
    finish: "Graphite",
    price: {
      amountMinor: 249_900,
      currency: "USD",
      display: "$2,499 USD",
    },
  },
  subtotal: {
    amountMinor: 249_900,
    currency: "USD",
    display: "$2,499 USD",
  },
  expiresAt: "2026-11-14T12:00:00.000Z",
};

async function fulfillJson(route: Route, json: unknown, status = 200) {
  await route.fulfill({ json, status });
}

const prohibitedProductLanguage =
  /\b(?:buy|checkout|preorder|in stock|out of stock|limited stock|shipping estimate|tax estimate|warranty)\b/i;

test.describe("Product experience", () => {
  test("renders the authoritative nine-section document with approved media and truth", async ({
    page,
  }) => {
    await page.goto("/monolith");

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Explore MONOLITH, a graphite eight-voice hybrid desktop synthesizer built around continuous movement between SUB and FRACTURE.",
    );
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

    const media = page.locator("[data-authored-media]");
    await expect(media).toHaveCount(5);
    await expect(media.first().locator('source[type="image/avif"]')).toHaveAttribute(
      "srcset",
      /product-hero-720\.avif 720w, \/media\/stills\/product-hero-1440\.avif 1440w/,
    );
    await expect(media.first().locator('source[type="image/webp"]')).toHaveAttribute(
      "srcset",
      /product-hero-720\.webp 720w, \/media\/stills\/product-hero-1440\.webp 1440w/,
    );
    await expect
      .poll(() =>
        media.locator("img").evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
      )
      .toBe(true);

    const productCopy = await page.getByRole("main").innerText();
    expect(productCopy).toContain("$2,499 USD");
    expect(productCopy).toContain("Eight voices");
    expect(productCopy).toContain("Two digital oscillators per voice");
    expect(productCopy).toContain("Resonant analog filter");
    expect(productCopy).toContain("360 × 210 × 80 mm (W × D × H)");
    expect(productCopy).toContain("Bead-blasted graphite aluminum");
    expect(productCopy).toContain("High-contrast OLED");
    expect(productCopy).not.toMatch(prohibitedProductLanguage);
    await expect(
      page.locator('[data-section="specifications"] dt', { hasText: /^Weight$/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("spinbutton")).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("stacks authored media before related content and keeps specifications readable at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/monolith");

    for (const sectionName of ["hero", "morph", "craft"] as const) {
      const section = page.locator(`[data-section="${sectionName}"]`);
      const mediaTop = await section
        .locator("[data-authored-media]")
        .first()
        .evaluate((element) => element.getBoundingClientRect().top);
      const headingTop = await section
        .getByRole(sectionName === "hero" ? "heading" : "heading", {
          level: sectionName === "hero" ? 1 : 2,
        })
        .evaluate((element) => element.getBoundingClientRect().top);
      expect(mediaTop).toBeLessThan(headingTop);
    }

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    const specificationRows = page.locator(
      '[data-section="specifications"] dl > div',
    );
    await expect(specificationRows).toHaveCount(14);
    for (const row of await specificationRows.all()) {
      await expect(row.locator("dt")).toBeVisible();
      await expect(row.locator("dd")).toBeVisible();
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("opens Bag from the repeated final action only after confirmed idempotent Add", async ({
    page,
  }) => {
    let releaseAdd!: () => void;
    const addGate = new Promise<void>((resolve) => (releaseAdd = resolve));
    await page.route("**/api/bag/add", async (route) => {
      await addGate;
      await fulfillJson(route, populatedBag);
    });
    await page.goto("/monolith");

    const finalAction = page.locator('[data-section="final-action"]');
    await finalAction.getByRole("button", { name: "Add MONOLITH to Bag" }).click();
    await expect(page.getByRole("dialog", { name: "Bag" })).toBeHidden();
    await expect(finalAction.getByRole("button")).toHaveText(
      "Adding MONOLITH to Bag…",
    );

    releaseAdd();
    await expect(page.getByRole("dialog", { name: "Bag" })).toBeVisible();
    await expect(
      page
        .getByRole("banner")
        .getByRole("button", { name: "Open Bag, 1 item" }),
    ).toBeVisible();
  });

  test("shows route-local progress while Try MORPH Lab navigation is pending", async ({
    page,
  }) => {
    let releaseNavigation!: () => void;
    const navigationGate = new Promise<void>(
      (resolve) => (releaseNavigation = resolve),
    );
    await page.goto("/monolith");
    await page.route("**/synth?*", async (route) => {
      await navigationGate;
      await route.continue();
    });

    const link = page.getByRole("link", { name: /TRY MORPH LAB/ });
    const click = link.click();
    await expect(link.locator('[data-navigation-state="pending"]')).toContainText(
      "Opening MORPH Lab…",
    );

    releaseNavigation();
    await click;
    await expect(page).toHaveURL(/\/synth$/);
  });

  test("direct entry requests authored images but no model, decoder, or audio implementation", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await page.goto("/monolith");
    await page.waitForLoadState("networkidle");

    expect(requests.join("\n")).toMatch(/product-(?:hero|morph)-(?:720|1440)\.(?:avif|webp)/);
    expect(requests.join("\n")).not.toMatch(
      /three|react-three|meshopt|decoder|\.glb(?:$|\?)|audio-worklet|engine\.client/i,
    );
  });
});
