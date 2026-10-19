import { expect, test } from "@playwright/test";

import {
  expectMinimumTargetSize,
  expectNoHorizontalPageScroll,
  expectNoWcagFindings,
  mockPopulatedBag,
} from "./helpers";

const coreRoutes = [
  { heading: "Sound, given mass.", path: "/" },
  { heading: "MONOLITH", path: "/monolith" },
  { heading: "One gesture. Endless change.", path: "/synth" },
  {
    heading: "Checkout Preview needs a confirmed Bag.",
    path: "/checkout-preview",
  },
] as const;

test.describe("automated accessibility qualification", () => {
  test.use({ viewport: { height: 720, width: 320 } });

  for (const route of coreRoutes) {
    test(`${route.path} has no automated A/AA findings at 320 CSS pixels`, async ({
      page,
    }) => {
      await page.goto(route.path);

      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await expectNoHorizontalPageScroll(page);
      await expectNoWcagFindings(page);
    });
  }

  test("qualifies populated Bag focus containment, reflow, and targets", async ({
    page,
  }) => {
    await mockPopulatedBag(page);
    await page.goto("/monolith");

    const trigger = page
      .getByRole("banner")
      .getByRole("button", { name: "Open Bag" });
    await trigger.click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag.getByRole("heading", { name: "Bag" })).toBeFocused();

    const lastTarget = bag.getByRole("link", { name: "Open MORPH Lab" });
    await lastTarget.focus();
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(document.activeElement?.closest('dialog[aria-labelledby="bag-dialog-title"]')),
        ),
      )
      .toBe(true);

    await expectNoHorizontalPageScroll(page);
    await expectMinimumTargetSize(page, '#bag-dialog a[href]:visible, #bag-dialog button:visible');
    await expectNoWcagFindings(page);

    await page.keyboard.press("Escape");
    await expect(bag).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("qualifies native ranges, visible values, keyboard focus, and polite status", async ({
    page,
  }) => {
    await page.goto("/synth");
    const selector = page.locator('[data-control-selector="cutoff"]');
    await selector.focus();
    await selector.press("Enter");

    const range = page.getByRole("slider", { name: "CUTOFF value" });
    await expect(range).toBeFocused();
    await expect(range).toHaveAttribute("min", "0");
    await expect(range).toHaveAttribute("max", "100");
    await expect(range).toHaveAttribute("step", "1");
    await range.press("ArrowRight");
    await expect(range).toHaveValue("55");
    await expect(page.locator("[data-control-announcement]")).toHaveText(
      "CUTOFF 55 percent.",
    );

    await expectMinimumTargetSize(
      page,
      '[data-control-selector]:visible, button:has-text("Enable Sound"):visible, button:has-text("Close"):visible',
    );
    await expectNoHorizontalPageScroll(page);
    await expectNoWcagFindings(page);

    await range.press("Escape");
    await expect(selector).toBeFocused();
  });

  test("qualifies Preview route focus, progress, status, and controls", async ({
    page,
  }) => {
    await mockPopulatedBag(page);
    await page.goto("/checkout-preview");

    const contact = page.getByRole("heading", { level: 1, name: "Contact" });
    await expect(contact).toBeFocused();
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Delivery" }),
    ).toBeFocused();
    await expect(page.getByText("Delivery stage", { exact: true })).toHaveCount(1);

    const progress = page.getByRole("list", { name: "Checkout Preview progress" });
    await expect(progress.getByRole("button", { name: "Delivery" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expectMinimumTargetSize(
      page,
      'main a[href]:visible, main button:visible',
    );
    await expectNoHorizontalPageScroll(page);
    await expectNoWcagFindings(page);
  });

  test("preserves semantics and visible focus under reduced motion and forced colors", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator("main")).toHaveAttribute(
      "data-home-presentation",
      "vertical",
    );
    await expect(page.locator("canvas, video, audio")).toHaveCount(0);
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    expect(
      await page.evaluate(() =>
        window.matchMedia("(forced-colors: active)").matches,
      ),
    ).toBe(true);
    await expect(page.locator('[class*="chapterSignal"]').first()).toBeHidden();
    await expect(skipLink).not.toHaveCSS("outline-style", "none");
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length))
      .toBe(0);
  });
});
