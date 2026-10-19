import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Route } from "@playwright/test";

export const emptyBag = {
  schemaVersion: 1,
  item: null,
  subtotal: null,
  expiresAt: null,
};

export const populatedBag = {
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
  expiresAt: "2099-11-14T12:00:00.000Z",
};

export async function fulfillJson(route: Route, json: unknown, status = 200) {
  await route.fulfill({ json, status });
}

export async function mockPopulatedBag(page: Page) {
  await page.route("**/api/bag", (route) => fulfillJson(route, populatedBag));
  await page.route("**/api/bag/add", (route) =>
    fulfillJson(route, populatedBag),
  );
}

export async function expectNoWcagFindings(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

export async function expectNoHorizontalPageScroll(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

export async function expectMinimumTargetSize(
  page: Page,
  selector = "a[href]:visible, button:visible",
) {
  const targets = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        label:
          element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "",
        width: bounds.width,
      };
    }),
  );

  expect(targets).not.toEqual([]);
  for (const target of targets) {
    expect.soft(target.width, `${target.label} width`).toBeGreaterThanOrEqual(44);
    expect.soft(target.height, `${target.label} height`).toBeGreaterThanOrEqual(44);
  }
}
