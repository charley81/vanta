import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalPageScroll,
  mockPopulatedBag,
} from "./helpers";

test.describe("critical visitor journey across mainstream engines", () => {
  test("navigates Product, Bag, Synth controls, and Checkout Preview by semantic controls", async ({
    page,
  }, testInfo) => {
    await mockPopulatedBag(page);
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Sound, given mass." }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-continuity-ready",
      "true",
    );
    const primaryProductLink = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" });
    if (await primaryProductLink.isVisible()) {
      await primaryProductLink.click();
    } else {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page
        .getByRole("dialog", { name: "Navigation" })
        .getByRole("link", { name: "Product" })
        .click();
    }
    await expect(page).toHaveURL(/\/monolith$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "MONOLITH" }),
    ).toBeFocused();

    const addButton = page
      .getByRole("button", { name: "Add MONOLITH to Bag" })
      .first();
    await addButton.click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag).toBeVisible();
    await expect(bag.getByRole("heading", { name: "Bag" })).toBeFocused();

    const lastBagTarget = bag.getByRole("link", { name: "Open MORPH Lab" });
    await lastBagTarget.focus();
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(document.activeElement?.closest('dialog[aria-labelledby="bag-dialog-title"]')),
        ),
      )
      .toBe(true);

    await bag.getByRole("button", { name: "Close Bag" }).click();
    await expect(bag).toBeHidden();
    await expect(addButton).toBeFocused();

    await page.getByRole("link", { name: "TRY MORPH LAB" }).click();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "One gesture. Endless change.",
      }),
    ).toBeFocused();

    const cutoffSelector = page.locator('[data-control-selector="cutoff"]');
    await cutoffSelector.focus();
    await cutoffSelector.press("Enter");
    const cutoff = page.getByRole("slider", { name: "CUTOFF value" });
    await expect(cutoff).toBeFocused();
    await cutoff.press("ArrowRight");
    await expect(cutoff).toHaveValue("55");
    await expect(page.locator("[data-control-announcement]")).toHaveText(
      "CUTOFF 55 percent.",
    );
    await cutoff.press("Escape");
    await expect(cutoffSelector).toBeFocused();

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open Bag, 1 item" })
      .click();
    await bag.getByRole("link", { name: "Enter Checkout Preview" }).click();
    await expect(page).toHaveURL(/\/checkout-preview$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Contact" }),
    ).toBeFocused();

    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Delivery" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Continue to review" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Review" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Complete preview" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Ordering offline" }),
    ).toBeFocused();
    await expect(
      page.getByText(
        "Checkout Preview complete. No order was placed and no payment information was collected.",
      ),
    ).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await testInfo.attach("critical-journey-environment", {
      body: Buffer.from(
        JSON.stringify(
          {
            browserName: testInfo.project.name,
            completedStages: ["home", "product", "bag", "synth", "preview"],
            viewport: testInfo.project.use.viewport,
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
  });
});
