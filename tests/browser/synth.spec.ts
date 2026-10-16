import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const controls = [
  ["morph", "MORPH", 50],
  ["cutoff", "CUTOFF", 54],
  ["resonance", "RESONANCE", 32],
  ["drive", "DRIVE", 24],
  ["attack", "ATTACK", 18],
  ["release", "RELEASE", 42],
] as const;

test.describe("Synth shell and semantic Control deck", () => {
  test("renders the silent authored scope and only the six approved selectors", async ({
    page,
  }) => {
    await page.goto("/synth");

    await expect(page.locator('[data-audio-state="off"]')).toContainText(
      "Nothing starts until you choose Enable Sound.",
    );
    await expect(page.getByText("A — C — D — E — D — C")).toBeVisible();
    await expect(
      page.getByText(/There is no keyboard, note grid, MIDI, chord mode/),
    ).toBeVisible();
    await expect(
      page.getByText(/OSC, MIX, MOD, LFO, TONE, DECAY, SUSTAIN/),
    ).toBeVisible();

    const selectors = page.locator("[data-control-selector]");
    await expect(selectors).toHaveCount(6);
    for (const [id, name, value] of controls) {
      const selector = page.locator(`[data-control-selector="${id}"]`);
      await expect(selector).toHaveAccessibleName(
        `Open ${name} control, current value ${value} percent`,
      );
    }

    const ranges = page.locator('main input[type="range"]');
    await expect(ranges).toHaveCount(6);
    for (const range of await ranges.all()) {
      await expect(range).toHaveAttribute("min", "0");
      await expect(range).toHaveAttribute("max", "100");
      await expect(range).toHaveAttribute("step", "1");
      await expect(range).toBeEnabled();
    }
    await expect(page.getByRole("slider")).toHaveCount(0);
  });

  test("uses native ranges, keyboard focus, Escape, and selector focus return", async ({
    page,
  }) => {
    await page.goto("/synth");
    const cutoffSelector = page.locator('[data-control-selector="cutoff"]');
    await cutoffSelector.focus();
    await cutoffSelector.press("Enter");

    const cutoff = page.getByRole("slider", { name: "CUTOFF value" });
    await expect(cutoff).toBeFocused();
    await expect(cutoff).toHaveValue("54");
    await cutoff.press("ArrowRight");
    await expect(cutoff).toHaveValue("55");
    await expect(cutoffSelector).toHaveAccessibleName(
      "Open CUTOFF control, current value 55 percent",
    );

    await cutoff.press("Escape");
    await expect(cutoffSelector).toBeFocused();
    await expect(cutoffSelector).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("slider")).toHaveCount(0);

    await page.locator('[data-control-selector="release"]').click();
    await expect(page.getByRole("slider", { name: "RELEASE value" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.locator('[data-control-selector="release"]')).toBeFocused();
  });

  test("throttles contextual parameter announcements while values update immediately", async ({
    page,
  }) => {
    await page.goto("/synth");
    await page.locator('[data-control-selector="morph"]').click();
    const range = page.getByRole("slider", { name: "MORPH value" });
    const announcement = page.locator("[data-control-announcement]");

    await range.fill("61");
    await range.fill("62");
    await range.fill("63");

    await expect(range).toHaveValue("63");
    await page.waitForTimeout(200);
    await expect(announcement).toHaveText("");
    await expect(announcement).toHaveText("MORPH 63 percent.", {
      timeout: 1_000,
    });
  });

  test("keeps one in-memory session across navigation and resets it on reload and a new tab", async ({
    context,
    page,
  }) => {
    await page.goto("/synth");
    await page.locator('[data-control-selector="drive"]').click();
    await page.getByRole("slider", { name: "DRIVE value" }).fill("87");
    await page.getByRole("button", { name: "Close" }).click();

    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" })
      .click();
    await page.goBack();
    await expect(page).toHaveURL(/\/synth$/);
    await expect(page.locator('[data-control-selector="drive"]')).toHaveAccessibleName(
      "Open DRIVE control, current value 87 percent",
    );

    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" })
      .click();
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Synth" })
      .click();

    const retainedDrive = page.locator('[data-control-selector="drive"]');
    await expect(retainedDrive).toHaveAttribute("aria-pressed", "true");
    await expect(retainedDrive).toHaveAccessibleName(
      "Open DRIVE control, current value 87 percent",
    );
    await expect(page.getByRole("slider")).toHaveCount(0);
    await retainedDrive.click();
    await expect(page.getByRole("slider", { name: "DRIVE value" })).toHaveValue(
      "87",
    );
    await expect
      .poll(() =>
        page.evaluate(() => ({
          local: Object.keys(localStorage).filter((key) => /morph/i.test(key)),
          session: Object.keys(sessionStorage).filter((key) => /morph/i.test(key)),
        })),
      )
      .toEqual({ local: [], session: [] });

    const newTab = await context.newPage();
    await newTab.goto("/synth");
    await expect(newTab.locator('[data-control-selector="morph"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(newTab.locator('[data-control-selector="drive"]')).toHaveAccessibleName(
      "Open DRIVE control, current value 24 percent",
    );
    await newTab.close();

    const duplicatePromise = context.waitForEvent("page");
    await page.evaluate(() => window.open(window.location.href, "_blank"));
    const duplicateTab = await duplicatePromise;
    await duplicateTab.waitForLoadState("domcontentloaded");
    await expect(
      duplicateTab.locator('[data-control-selector="morph"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      duplicateTab.locator('[data-control-selector="drive"]'),
    ).toHaveAccessibleName("Open DRIVE control, current value 24 percent");
    await duplicateTab.close();

    await page.reload();
    await expect(page.locator('[data-control-selector="morph"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator('[data-control-selector="drive"]')).toHaveAccessibleName(
      "Open DRIVE control, current value 24 percent",
    );
  });

  test("crosses the sound boundary only after activation and reports local unavailability", async ({
    page,
  }) => {
    await page.goto("/synth");
    await expect(page.locator('[data-audio-state="off"]')).toBeVisible();

    await page.getByRole("button", { name: "Enable Sound" }).click();
    await expect(page.locator('[data-audio-state="unavailable"]')).toContainText(
      "Sound is unavailable in this build.",
    );
    await expect(page.getByRole("button", { name: "Retry sound" })).toBeEnabled();

    const resources = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );
    expect(resources.join("\n")).not.toMatch(
      /audio-worklet|\.mp3(?:$|\?)|\.wav(?:$|\?)|\.ogg(?:$|\?)/i,
    );
  });

  test("reflows at 320 CSS pixels with accessible targets and no serious findings", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/synth");
    await page.locator('[data-control-selector="attack"]').click();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    for (const target of await page
      .locator(
        '[data-control-selector]:visible, button:has-text("Enable Sound"):visible, button:has-text("Close"):visible',
      )
      .all()) {
      const box = await target.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
