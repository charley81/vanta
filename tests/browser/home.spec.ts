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

  test("maps native vertical document progress to a reversible horizontal passage", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const main = page.locator("main");
    await expect(main).toHaveAttribute("data-home-presentation", "horizontal");
    const geometry = await page.locator("[data-chapter]").evaluateAll((chapters) => {
      const first = chapters.at(0) as HTMLElement;
      const last = chapters.at(-1) as HTMLElement;
      const start = Number(first.dataset.continuityTop);
      return {
        start,
        travel: Number(last.dataset.continuityTop) - start,
      };
    });

    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), geometry.start);
    await expect(main).toHaveAttribute("data-home-active-chapter", "philosophy");
    await page.evaluate(
      ({ start, travel }) =>
        window.scrollTo({ top: start + travel / 2, behavior: "instant" }),
      geometry,
    );
    await expect(main).toHaveAttribute("data-home-active-chapter", "morph");
    await expect(main).toHaveAttribute("data-home-progress", "0.5000");
    const translated = await page.locator('[data-home-sequence="chapters"]').evaluate(
      (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
    );
    expect(translated).toBeLessThan(0);

    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), geometry.start);
    await expect(main).toHaveAttribute("data-home-progress", "0.0000");
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

  test("keeps the complete narrative in a stable vertical 320 CSS-pixel composition", async ({
    page,
  }) => {
    const viewport = { width: 320, height: 720 };
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

  test("uses the exact viewport eligibility thresholds", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 608 });
    await page.goto("/");
    await expect(page.locator("main")).toHaveAttribute(
      "data-home-presentation",
      "horizontal",
    );

    await page.setViewportSize({ width: 1023, height: 608 });
    await expect(page.locator("main")).toHaveAttribute(
      "data-home-presentation",
      "vertical",
    );
    await expect(page.locator("main")).toHaveAttribute(
      "data-home-fallback",
      "viewport",
    );

    await page.setViewportSize({ width: 1024, height: 607 });
    await expect(page.locator("main")).toHaveAttribute(
      "data-home-presentation",
      "vertical",
    );
  });

  test("falls back vertically when sticky positioning is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      const nativeSupports = CSS.supports.bind(CSS);
      Object.defineProperty(CSS, "supports", {
        configurable: true,
        value: (property: string, value?: string) =>
          property === "position" && value === "sticky"
            ? false
            : value === undefined
              ? nativeSupports(property)
              : nativeSupports(property, value),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(page.locator("main")).toHaveAttribute(
      "data-home-presentation",
      "vertical",
    );
    await expect(page.locator("main")).toHaveAttribute(
      "data-home-fallback",
      "sticky",
    );
  });

  test("preserves the semantic chapter through live resize and preference changes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const main = page.locator("main");
    await expect(main).toHaveAttribute("data-home-presentation", "horizontal");

    await page.locator("#chapter-morph").evaluate((heading) => {
      const element = heading as HTMLElement;
      element.tabIndex = -1;
      element.focus();
    });
    await expect(main).toHaveAttribute("data-home-active-chapter", "morph");
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(main).toHaveAttribute("data-home-presentation", "vertical");
    await expect(page.locator('[data-chapter="morph"]')).toBeInViewport();

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(main).toHaveAttribute("data-home-presentation", "horizontal");
    await expect(main).toHaveAttribute("data-home-active-chapter", "morph");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(main).toHaveAttribute("data-home-presentation", "vertical");
    await expect(main).toHaveAttribute("data-home-fallback", "reduced-motion");
    await expect(page.locator('[data-chapter="morph"]')).toBeInViewport();
  });

  test("keeps wheel, keyboard, touch, and focus behavior browser-native", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const main = page.locator("main");
    const start = await page
      .locator("[data-chapter]")
      .first()
      .evaluate((chapter) =>
        Number((chapter as HTMLElement).dataset.continuityTop),
      );
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), start);

    await page.mouse.wheel(0, 700);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(start);
    const afterWheel = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("PageDown");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(afterWheel);

    expect(
      await page.evaluate(() => {
        const event = new TouchEvent("touchmove", {
          bubbles: true,
          cancelable: true,
        });
        return {
          dispatched: window.dispatchEvent(event),
          prevented: event.defaultPrevented,
        };
      }),
    ).toEqual({ dispatched: true, prevented: false });

    await page.locator("#home-resolution-action").focus();
    await expect(main).toHaveAttribute("data-home-active-chapter", "resolution");
    await expect(page.locator("#home-resolution-action")).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

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
