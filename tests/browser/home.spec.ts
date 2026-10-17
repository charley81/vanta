import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const canonicalBeats = [
  "opening",
  "philosophy",
  "reveal",
  "sub",
  "monolith",
  "morph",
  "gesture",
  "fracture",
  "craft",
  "resolution",
  "lab-invitation",
  "closing",
] as const;

const canonicalChapters = canonicalBeats.slice(1, 10);

test.describe("Home Core narrative", () => {
  test("renders every beat once in canonical semantic order with all route exits", async ({
    page,
  }) => {
    await page.goto("/");

    await expect
      .poll(() =>
        page.locator("[data-home-beat]").evaluateAll((sections) =>
          sections.map((section) => section.getAttribute("data-home-beat")),
        ),
      )
      .toEqual(canonicalBeats);
    await expect
      .poll(() =>
        page.locator("[data-chapter]").evaluateAll((sections) =>
          sections.map((section) => section.getAttribute("data-chapter")),
        ),
      )
      .toEqual(canonicalChapters);
    await expect
      .poll(() =>
        page.locator("[data-chapter] > p").allTextContents(),
      )
      .toEqual(canonicalChapters.map((_, index) => `${String(index + 1).padStart(2, "0")} / 09`));

    await expect(page.locator("[data-home-beat] section")).toHaveCount(0);
    await expect(page.locator("[data-home-beat][hidden]")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "ENTER MORPH LAB" })).toHaveCount(2);
    await expect(page.getByRole("link", { name: "EXPLORE MONOLITH" })).toHaveAttribute(
      "href",
      "/monolith",
    );

    const labLinks = page.getByRole("link", { name: "ENTER MORPH LAB" });
    await expect(labLinks.nth(0)).toHaveAttribute("href", "/synth");
    await expect(labLinks.nth(1)).toHaveAttribute("href", "/synth");

    const media = page.locator('[data-authored-media="home-poster"] img');
    await expect(media).toBeVisible();
    await expect(media).toHaveJSProperty("complete", true);
    expect(await media.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  });

  for (const viewport of [
    { name: "wide", width: 1440, height: 900 },
    { name: "narrow", width: 320, height: 720 },
  ] as const) {
    test(`keeps the complete narrative in a stable vertical ${viewport.name} composition`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      await expect(page.locator("main")).toHaveAttribute(
        "data-home-presentation",
        "vertical",
      );
      const geometry = await page.locator("[data-home-beat]").evaluateAll((sections) =>
        sections.map((section) => {
          const bounds = section.getBoundingClientRect();
          return {
            left: bounds.left,
            right: bounds.right,
            top: bounds.top + window.scrollY,
          };
        }),
      );
      expect(geometry.map(({ top }) => top)).toEqual(
        [...geometry.map(({ top }) => top)].sort((a, b) => a - b),
      );
      for (const bounds of geometry) {
        expect(bounds.left).toBeGreaterThanOrEqual(-1);
        expect(bounds.right).toBeLessThanOrEqual(viewport.width + 1);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("uses the same static vertical narrative for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    expect(
      await page.evaluate(() =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    await expect(page.locator("[data-home-beat]")).toHaveCount(canonicalBeats.length);
    await expect(page.locator("canvas, video, audio")).toHaveCount(0);
    await expect(page.locator("[data-home-presentation]")).toHaveAttribute(
      "data-home-presentation",
      "vertical",
    );

    const movingDecorations = await page
      .locator('[data-authored-media="home-poster"], [class*="chapterSignal"], [class*="labDial"]')
      .evaluateAll((elements) =>
        elements.filter((element) => {
          const style = getComputedStyle(element);
          return style.animationName !== "none" || style.transform !== "none";
        }).length,
      );
    expect(movingDecorations).toBe(0);
  });

  test("creates no sound or MORPH state while the cinematic narrative is explored", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('[data-home-beat="resolution"]').scrollIntoViewIfNeeded();
    await page.locator('[data-home-beat="opening"]').scrollIntoViewIfNeeded();

    await expect(page.locator("canvas, video, audio, [data-audio-state]")).toHaveCount(0);
    const resources = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );
    expect(resources.join("\n")).toMatch(/home-poster-(?:720|1440)\.(?:avif|webp)/);
    expect(resources.join("\n")).not.toMatch(
      /three|decoder|\.glb(?:$|\?)|audio-worklet/i,
    );
    expect(
      await page.evaluate(() => ({
        local: Object.keys(window.localStorage).filter((key) => /morph|audio/i.test(key)),
        session: Object.keys(window.sessionStorage).filter((key) => /morph|audio/i.test(key)),
      })),
    ).toEqual({ local: [], session: [] });
  });

  test("remains complete on direct entry without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 720 },
    });
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.locator("[data-home-beat]")).toHaveCount(canonicalBeats.length);
    await expect(page.locator("[data-chapter]")).toHaveCount(canonicalChapters.length);
    await expect(page.locator('[data-authored-media="home-poster"] img')).toBeVisible();
    await expect(page.getByRole("link", { name: "EXPLORE MONOLITH" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ENTER MORPH LAB" })).toHaveCount(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await context.close();
  });
});
