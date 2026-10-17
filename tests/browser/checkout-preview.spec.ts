import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Route, test } from "@playwright/test";

const emptyBag = {
  schemaVersion: 1,
  item: null,
  subtotal: null,
  expiresAt: null,
};

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

async function confirmBag(page: Page, bag: unknown = populatedBag) {
  await page.route("**/api/bag", (route) => fulfillJson(route, bag));
}

test.describe("Signal Ledger Checkout Preview", () => {
  test("renders Contact from a confirmed Bag with exact synthetic content and no editable fields", async ({
    page,
  }) => {
    await confirmBag(page);
    await page.goto("/checkout-preview");

    await expect(
      page.getByText(
        "Preview — Synthetic details only. Nothing is entered, submitted, stored, or sent to Shopify.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect(page.getByText("Mara Vale", { exact: true })).toBeVisible();
    await expect(page.getByText("mara.vale@example.invalid")).toBeVisible();
    await expect(page.getByText("Not collected", { exact: true })).toBeVisible();
    await expect(page.getByText("PREDEFINED / FICTIONAL")).toBeVisible();

    const progress = page.getByRole("list", { name: "Checkout Preview progress" });
    await expect(progress.getByRole("button", { name: /Contact/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(progress.getByRole("button", { name: /Delivery/ })).toBeDisabled();
    await expect(progress.getByRole("button", { name: /Review/ })).toBeDisabled();

    const ledger = page.getByRole("complementary", {
      name: "Preview order summary",
    });
    await expect(ledger.getByText("MONOLITH", { exact: true })).toBeVisible();
    await expect(ledger.getByText("Graphite / Quantity 1")).toBeVisible();
    await expect(ledger.getByText("$2,499.00")).toBeVisible();
    await expect(ledger.getByText("$0.00")).toBeVisible();
    await expect(ledger.getByText("Not calculated")).toBeVisible();
    await expect(ledger.getByText("$2,499 USD")).toBeVisible();
    await expect(
      ledger.getByText(
        "No charge, authorization, order, reservation, or price commitment.",
      ),
    ).toBeVisible();
    await expect(page.locator("input, textarea, select")).toHaveCount(0);
  });

  test("advances, revisits, and retraces only reached same-URL states through completion", async ({
    page,
  }) => {
    await confirmBag(page);
    await page.goto("/checkout-preview");
    const canonicalUrl = page.url();

    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(page).toHaveURL(canonicalUrl);
    await expect(page.getByRole("heading", { level: 1, name: "Delivery" })).toBeFocused();
    await expect(
      page.getByText(
        "VANTA Preview Studio, 101 Signal Way, Portland, OR 97205, United States",
      ),
    ).toBeVisible();
    await expect(page.getByText("Studio courier")).toBeVisible();
    await expect(page.getByText("3–5 preview days")).toBeVisible();
    await expect(page.getByText("$0.00 preview")).toBeVisible();

    await page.getByRole("button", { name: "Continue to review" }).click();
    await expect(page).toHaveURL(canonicalUrl);
    await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeFocused();
    await expect(page.getByText("No payment, discounts, gift cards, tax quotes, or buyer input")).toBeVisible();
    await expect(page.getByText("No Shopify Checkout, orders, fulfillment, or notifications")).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete preview" })).toBeVisible();

    await page.getByRole("button", { name: "Contact" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Review", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.getByRole("button", { name: "Complete preview" }).click();

    await expect(page).toHaveURL(canonicalUrl);
    await expect(page.getByRole("heading", { level: 1, name: "Ordering offline" })).toBeFocused();
    await expect(
      page.getByText(
        "Checkout Preview complete. No order was placed and no payment information was collected.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Not requested", { exact: true })).toBeVisible();
    await expect(page.getByText("Not created", { exact: true })).toBeVisible();
    await expect(page.getByText("Not collected", { exact: true })).toBeVisible();
    await expect(page.getByText("MONOLITH retained", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Return to MONOLITH" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview again" })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeFocused();
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await page.goForward();
    await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeFocused();
    await page.goForward();
    await expect(page.getByRole("heading", { level: 1, name: "Ordering offline" })).toBeFocused();
  });

  test("offers explicit resume or restart after an interrupted Preview", async ({ page }) => {
    await confirmBag(page);
    await page.goto("/checkout-preview");
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.reload();

    const recovery = page.getByRole("alertdialog", { name: "Continue Checkout Preview?" });
    await expect(recovery).toBeVisible();
    await expect(recovery.getByRole("button", { name: "Resume Delivery" })).toBeFocused();
    await expect(recovery.getByText(/No visitor data was saved/)).toBeVisible();
    await recovery.getByRole("button", { name: "Resume Delivery" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Delivery" })).toBeFocused();

    await page.reload();
    await recovery.getByRole("button", { name: "Start again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Delivery", exact: true })).toBeDisabled();
  });

  test("fails closed for an empty Bag and clears Preview when MONOLITH is removed", async ({ page }) => {
    let bag: unknown = populatedBag;
    await page.route("**/api/bag", (route) => fulfillJson(route, bag));
    await page.route("**/api/bag/remove", (route) => {
      bag = emptyBag;
      return fulfillJson(route, emptyBag);
    });
    await page.goto("/checkout-preview");
    await page.getByRole("button", { name: "Continue to delivery" }).click();

    await page.getByRole("banner").getByRole("button", { name: "Open Bag" }).click();
    const disclosure = page.getByRole("dialog", { name: "Bag" });
    await disclosure.getByRole("button", { name: "Remove MONOLITH" }).click();
    await disclosure.getByRole("button", { name: "Close Bag" }).click();

    await expect(
      page.getByRole("heading", { name: "Checkout Preview needs a confirmed Bag." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to MONOLITH" })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("vanta:checkout-preview:v1")))
      .toBeNull();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Checkout Preview needs a confirmed Bag." }),
    ).toBeVisible();
  });

  test("revalidates Bag authority when confirmed membership expires", async ({ page }) => {
    let reads = 0;
    await page.route("**/api/bag", (route) => {
      reads += 1;
      return fulfillJson(
        route,
        reads === 1
          ? {
              ...populatedBag,
              expiresAt: new Date(Date.now() + 1_500).toISOString(),
            }
          : emptyBag,
      );
    });
    await page.goto("/checkout-preview");
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();

    await expect(
      page.getByRole("heading", { name: "Checkout Preview needs a confirmed Bag." }),
    ).toBeVisible();
    expect(reads).toBeGreaterThanOrEqual(2);
  });

  test("keeps Bag confirmation failure local and offers targeted retry", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/bag", (route) => {
      attempts += 1;
      if (attempts <= 2) {
        return fulfillJson(
          route,
          { error: { code: "bag_disabled", message: "Bag is temporarily unavailable." } },
          503,
        );
      }
      return fulfillJson(route, populatedBag);
    });
    await page.goto("/checkout-preview");

    await expect(
      page.getByRole("heading", { name: "Checkout Preview needs a confirmed Bag." }),
    ).toBeVisible();
    await expect(page.getByRole("main").getByText("Bag is temporarily unavailable.")).toBeVisible();
    await page.getByRole("button", { name: "Retry Bag confirmation" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    expect(attempts).toBe(3);
  });

  test("discards forged and unknown-version progress without unlocking a stage", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        "vanta:checkout-preview:v1",
        JSON.stringify({
          version: 99,
          reachedStage: "review",
          activeStage: "review",
          completed: true,
          lastMeaningfulActivityAt: Date.now(),
        }),
      );
    });
    await confirmBag(page);
    await page.goto("/checkout-preview");

    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Review", exact: true })).toBeDisabled();

    await page.evaluate(() => {
      window.history.replaceState(
        {
          ...window.history.state,
          __vantaCheckoutPreview: { version: 1, stage: "terminal", depth: 3 },
        },
        "",
        window.location.href,
      );
      window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    });
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.history.state.__vantaCheckoutPreview?.stage,
        ),
      )
      .toBe("contact");
  });

  test("consumes Preview history on restart, Return, Exit, and global navigation", async ({ page }) => {
    await confirmBag(page);
    await page.goto("/checkout-preview");
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Continue to review" }).click();
    await page.getByRole("button", { name: "Complete preview" }).click();

    await page.getByRole("button", { name: "Preview again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Delivery", exact: true })).toBeDisabled();
    await expect
      .poll(() => page.evaluate(() => window.history.state.__vantaCheckoutPreview?.depth))
      .toBe(0);

    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Continue to review" }).click();
    await page.getByRole("button", { name: "Complete preview" }).click();
    await page.getByRole("button", { name: "Return to MONOLITH" }).click();
    await expect(page).toHaveURL(/\/monolith$/);
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("vanta:checkout-preview:v1")))
      .toBeNull();

    await page.goto("/checkout-preview");
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Exit preview" }).click();
    await expect(page).toHaveURL(/\/monolith$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/checkout-preview");
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Navigation" });
    await menu.getByRole("link", { name: "Synth" }).click();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(menu).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("vanta:checkout-preview:v1")))
      .toBeNull();
  });

  test("keeps progress data-only, makes no transactional request, and passes automated accessibility", async ({ page }) => {
    const apiRequests: Array<{ method: string; path: string }> = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith("/api/")) {
        apiRequests.push({ method: request.method(), path: url.pathname });
      }
    });
    await confirmBag(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/checkout-preview");
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Continue to review" }).click();
    await page.getByRole("button", { name: "Complete preview" }).click();

    expect(apiRequests).toEqual([{ method: "GET", path: "/api/bag" }]);
    const storage = await page.evaluate(() => ({
      localKeys: Object.keys(localStorage),
      sessionEntries: Object.entries(sessionStorage),
    }));
    expect(storage.localKeys).toEqual([]);
    expect(storage.sessionEntries).toHaveLength(1);
    expect(storage.sessionEntries[0][0]).toBe("vanta:checkout-preview:v1");
    const progress = JSON.parse(storage.sessionEntries[0][1]) as Record<string, unknown>;
    expect(Object.keys(progress).sort()).toEqual([
      "activeStage",
      "completed",
      "lastMeaningfulActivityAt",
      "reachedStage",
      "version",
    ]);
    expect(JSON.stringify(progress)).not.toMatch(/Mara|example.invalid|Signal Way|payment/i);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
