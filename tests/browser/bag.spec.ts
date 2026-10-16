import AxeBuilder from "@axe-core/playwright";
import { expect, type Route, test } from "@playwright/test";

const empty = {
  schemaVersion: 1,
  item: null,
  subtotal: null,
  expiresAt: null,
};

const populated = {
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

test.describe("Bag disclosure", () => {
  test("Add to Bag opens only after confirmation and renders the approved linear contents", async ({
    page,
  }) => {
    let releaseAdd!: () => void;
    const addGate = new Promise<void>((resolve) => (releaseAdd = resolve));
    await page.route("**/api/bag/add", async (route) => {
      await addGate;
      await fulfillJson(route, populated);
    });
    await page.goto("/monolith");

    await page.getByRole("button", { name: "Add MONOLITH to Bag" }).first().click();
    await expect(page.getByRole("dialog", { name: "Bag" })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Add MONOLITH to Bag" }).first(),
    ).toHaveText("Adding MONOLITH to Bag…");

    releaseAdd();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toBeVisible();
    await expect(bag.getByRole("heading", { name: "Bag" })).toBeFocused();
    await expect(bag.getByText("Same-browser Bag / 30 days")).toBeVisible();
    await expect(bag.getByText("Graphite / Quantity 1")).toBeVisible();
    await expect(bag.getByText("$2,499 USD")).toHaveCount(2);
    await expect(bag.getByRole("button", { name: "Remove MONOLITH" })).toBeVisible();
    await expect(
      bag.getByText(/non-transactional Checkout Preview/),
    ).toBeVisible();
    await expect(
      bag.getByRole("link", { name: "Enter Checkout Preview" }),
    ).toBeVisible();
    await expect(bag.getByRole("button", { name: "Return to Product" })).toBeVisible();
    await expect(bag.getByRole("link", { name: "Open MORPH Lab" })).toBeVisible();
    await expect(bag.getByRole("spinbutton")).toHaveCount(0);
    await expect(bag.getByRole("textbox")).toHaveCount(0);
  });

  test("a late Add updates the count without reopening after route navigation", async ({
    page,
  }) => {
    let releaseAdd!: () => void;
    const addGate = new Promise<void>((resolve) => (releaseAdd = resolve));
    await page.route("**/api/bag/add", async (route) => {
      await addGate;
      await fulfillJson(route, populated);
    });
    await page.goto("/monolith");

    await page.getByRole("button", { name: "Add MONOLITH to Bag" }).first().click();
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Synth" })
      .click();
    await expect(page).toHaveURL(/\/synth$/);

    releaseAdd();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Open Bag, 1 item" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Bag" })).toBeHidden();
  });

  test("failed removal preserves the confirmed item and Retry reaches the empty state", async ({
    page,
  }) => {
    let removeAttempts = 0;
    await page.route("**/api/bag/add", (route) => fulfillJson(route, populated));
    await page.route("**/api/bag/remove", async (route) => {
      removeAttempts += 1;
      if (removeAttempts === 1) {
        await fulfillJson(
          route,
          {
            error: {
              code: "bag_disabled",
              message: "Bag is temporarily unavailable.",
            },
          },
          503,
        );
        return;
      }
      await fulfillJson(route, empty);
    });
    await page.goto("/monolith");
    await page.getByRole("button", { name: "Add MONOLITH to Bag" }).first().click();

    const bag = page.getByRole("dialog", { name: "Bag" });
    await bag.getByRole("button", { name: "Remove MONOLITH" }).click();
    await expect(bag.getByText("Bag is temporarily unavailable.")).toBeVisible();
    await expect(bag.getByText("Graphite / Quantity 1")).toBeVisible();

    await bag.getByRole("button", { name: "Retry remove" }).click();
    await expect(bag.getByText("Your Bag is empty.")).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Open Bag, 0 items" }),
    ).toBeVisible();
  });

  test("is one responsive history-aware modal and consumes named destinations", async ({
    page,
  }) => {
    await page.route("**/api/bag", (route) => fulfillJson(route, empty));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/monolith");
    const trigger = page
      .getByRole("banner")
      .getByRole("button", { name: "Open Bag" });
    const initialHistoryLength = await page.evaluate(() => window.history.length);
    await page.evaluate(() => {
      window.history.replaceState(
        { ...window.history.state, __vantaBagDisclosure: { version: 99 } },
        "",
        window.location.href,
      );
      window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => !("__vantaBagDisclosure" in (window.history.state ?? {})),
        ),
      )
      .toBe(true);
    await page.evaluate(() => {
      document.addEventListener("vanta:bag-opened", () => {
        const count = Number(document.documentElement.dataset.bagOpened ?? "0");
        document.documentElement.dataset.bagOpened = String(count + 1);
      });
    });

    await trigger.click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag.getByRole("heading", { name: "Bag" })).toBeFocused();
    await expect
      .poll(() => bag.evaluate((element) => element.getBoundingClientRect().width))
      .toBe(390);
    await expect
      .poll(() => page.evaluate(() => window.history.length))
      .toBe(initialHistoryLength + 1);

    await page.keyboard.press("Escape");
    await expect(bag).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-bag-opened", "1");

    await trigger.click();
    await page.goBack();
    await expect(bag).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.setViewportSize({ width: 1440, height: 900 });
    await trigger.click();
    await page.mouse.click(20, 450);
    await expect(bag).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await bag.getByRole("link", { name: "Open MORPH Lab" }).click();
    await expect(page).toHaveURL(/\/synth$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/monolith$/);
    await expect(bag).toBeHidden();
  });

  test("sends cross-tab invalidation only and refetches on focus", async ({
    context,
    page,
  }) => {
    let serverSnapshot: unknown = empty;
    let reads = 0;
    await context.route("**/api/bag", async (route) => {
      reads += 1;
      await fulfillJson(route, serverSnapshot);
    });
    await context.route("**/api/bag/add", async (route) => {
      serverSnapshot = populated;
      await fulfillJson(route, populated);
    });

    const otherTab = await context.newPage();
    await otherTab.goto("/");
    const otherTrigger = otherTab
      .getByRole("banner")
      .getByRole("button", { name: "Open Bag" });
    await otherTrigger.click();
    await otherTab.getByRole("button", { name: "Close Bag" }).click();
    await expect(otherTrigger).toHaveAttribute("aria-label", "Open Bag, 0 items");

    await page.goto("/monolith");
    await page.getByRole("button", { name: "Add MONOLITH to Bag" }).first().click();
    await expect(page.getByRole("dialog", { name: "Bag" })).toBeVisible();
    await expect(otherTrigger).toHaveAttribute("aria-label", "Open Bag, 0 items");

    await otherTab.bringToFront();
    await otherTab.getByRole("heading", { level: 1 }).click();
    await expect(otherTrigger).toHaveAttribute("aria-label", "Open Bag, 1 item");
    expect(reads).toBe(2);
  });

  test("reflows at 320px with accessible targets and no serious findings", async ({
    page,
  }) => {
    await page.route("**/api/bag/add", (route) => fulfillJson(route, populated));
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/monolith");
    await page.getByRole("button", { name: "Add MONOLITH to Bag" }).first().click();

    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      )
      .toBe(true);
    const targets = await bag.locator("a:visible, button:visible").evaluateAll(
      (elements) =>
        elements.map((element) => {
          const bounds = element.getBoundingClientRect();
          return { height: bounds.height, width: bounds.width };
        }),
    );
    for (const target of targets) {
      expect.soft(target.height).toBeGreaterThanOrEqual(44);
      expect.soft(target.width).toBeGreaterThanOrEqual(44);
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
