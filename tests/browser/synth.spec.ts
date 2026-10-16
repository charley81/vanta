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
    await page.goto("/monolith");
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Synth" })
      .click();
    await page.locator('[data-control-selector="drive"]').click();
    await page.getByRole("slider", { name: "DRIVE value" }).fill("87");
    await page.getByRole("button", { name: "Close" }).click();

    await page.goBack();
    await expect(page).toHaveURL(/\/monolith$/);
    await page.goForward();
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

  test("loads native audio only after activation and meets cold, warm, and control scheduling budgets", async ({
    page,
  }, testInfo) => {
    await page.goto("/synth");
    const status = page.locator('[data-audio-state="off"]');
    await expect(status).toBeVisible();
    const resourcesBeforeActivation = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );

    await page.getByRole("button", { name: "Enable Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toContainText(
      "Sound is playing.",
    );
    const coldLatency = Number(
      await page
        .locator('[data-audio-state="playing"]')
        .getAttribute("data-audio-cold-latency-ms"),
    );
    expect(coldLatency).toBeLessThanOrEqual(500);
    await expect(page.getByRole("button", { name: "Pause Sound" })).toBeEnabled();

    await page.locator('[data-control-selector="morph"]').click();
    await page.getByRole("slider", { name: "MORPH value" }).fill("64");
    await expect
      .poll(async () =>
        Number(
          await page
            .locator('[data-audio-state="playing"]')
            .getAttribute("data-audio-control-latency-ms"),
        ),
      )
      .toBeLessThanOrEqual(50);
    const visibleInNextFrame = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const range = document.querySelector<HTMLInputElement>(
            '#control-range-morph',
          );
          const valueSetter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set;
          if (!range || !valueSetter) return resolve(false);
          valueSetter.call(range, "65");
          range.dispatchEvent(new Event("input", { bubbles: true }));
          requestAnimationFrame(() => {
            const selector = document.querySelector(
              '[data-control-selector="morph"]',
            );
            resolve(selector?.textContent?.includes("65%") ?? false);
          });
        }),
    );
    expect(visibleInNextFrame).toBe(true);

    await page.getByRole("button", { name: "Pause Sound" }).click();
    await expect(page.locator('[data-audio-state="paused"]')).toContainText(
      "will resume only",
    );
    await page.getByRole("button", { name: "Resume Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toBeVisible();
    const warmLatency = Number(
      await page
        .locator('[data-audio-state="playing"]')
        .getAttribute("data-audio-warm-latency-ms"),
    );
    expect(warmLatency).toBeLessThanOrEqual(150);
    const controlLatency = Number(
      await page
        .locator('[data-audio-state="playing"]')
        .getAttribute("data-audio-control-latency-ms"),
    );
    await testInfo.attach("audio-latency-trace", {
      body: Buffer.from(
        JSON.stringify(
          {
            budgetsMs: { cold: 500, controlSchedule: 50, warm: 150 },
            measurementsMs: {
              cold: coldLatency,
              controlSchedule: controlLatency,
              warm: warmLatency,
            },
            visibleUpdateByNextAnimationFrame: visibleInNextFrame,
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });

    const resourcesAfterActivation = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );
    const resourcesLoadedByActivation = resourcesAfterActivation.filter(
      (resource) => !resourcesBeforeActivation.includes(resource),
    );
    expect(resourcesLoadedByActivation.some((resource) => /\.js(?:$|\?)/.test(resource))).toBe(
      true,
    );
    expect(resourcesAfterActivation.join("\n")).not.toMatch(
      /audio-worklet|\.mp3(?:$|\?)|\.wav(?:$|\?)|\.ogg(?:$|\?)/i,
    );
  });

  test("coalesces lifecycle and platform interruptions, disposes on commit, and requires explicit resume", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const NativeAudioContext = window.AudioContext;
      const state: {
        closed: number;
        created: number;
        latest: AudioContext | null;
      } = { closed: 0, created: 0, latest: null };
      class TrackedAudioContext extends NativeAudioContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          state.created += 1;
          state.latest = this;
        }

        override async close() {
          state.closed += 1;
          return super.close();
        }
      }
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: TrackedAudioContext,
      });
      Object.defineProperty(window, "__vantaAudioTestState", {
        configurable: true,
        value: state,
      });
    });
    await page.goto("/synth");
    await page.locator('[data-control-selector="drive"]').click();
    await page.getByRole("slider", { name: "DRIVE value" }).fill("79");
    await page.getByRole("button", { name: "Enable Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toBeVisible();

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("visibilitychange"));
      document.dispatchEvent(new Event("freeze"));
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
    });
    await expect(page.locator('[data-audio-state="interrupted"]')).toContainText(
      "will not resume automatically",
    );
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    await expect(page.locator('[data-audio-state="interrupted"]')).toBeVisible();
    await expect(page.getByRole("slider", { name: "DRIVE value" })).toHaveValue(
      "79",
    );

    await page.getByRole("button", { name: "Resume Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toBeVisible();
    await page.evaluate(() => {
      document.dispatchEvent(new Event("freeze"));
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    await expect(page.locator('[data-audio-state="interrupted"]')).toBeVisible();

    await page.getByRole("button", { name: "Resume Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toBeVisible();
    await page.evaluate(async () => {
      const state = (
        window as Window & {
          __vantaAudioTestState?: { latest: AudioContext | null };
        }
      ).__vantaAudioTestState;
      await state?.latest?.suspend();
    });
    await expect(page.locator('[data-audio-state="interrupted"]')).toBeVisible();

    await page.getByRole("button", { name: "Resume Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toBeVisible();
    await page
      .getByRole("banner")
      .getByRole("button", { name: /Open Bag/ })
      .click();
    await expect(page.locator('[data-audio-state="interrupted"]')).toBeVisible();
    await page.getByRole("button", { name: "Close Bag" }).click();
    await expect(page.locator('[data-audio-state="interrupted"]')).toBeVisible();

    await page.getByRole("button", { name: "Resume Sound" }).click();
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Product" })
      .click();
    await expect(page).toHaveURL(/\/monolith$/);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __vantaAudioTestState?: { closed: number };
              }
            ).__vantaAudioTestState?.closed ?? -1,
        ),
      )
      .toBe(1);

    await page.goBack();
    await expect(page.locator('[data-audio-state="interrupted"]')).toBeVisible();
    await expect(page.locator('[data-control-selector="drive"]')).toHaveAccessibleName(
      "Open DRIVE control, current value 79 percent",
    );
    await page.getByRole("button", { name: "Resume Sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __vantaAudioTestState?: { created: number };
              }
            ).__vantaAudioTestState?.created ?? -1,
        ),
      )
      .toBe(2);
  });

  test("keeps the Control deck useful through audio failure and targeted Retry", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const NativeAudioContext = window.AudioContext;
      let failNextConstruction = true;
      const FaultInjectedAudioContext = new Proxy(NativeAudioContext, {
        construct(target, argumentsList) {
          if (failNextConstruction) {
            failNextConstruction = false;
            throw new DOMException("Injected audio failure", "NotSupportedError");
          }
          return Reflect.construct(target, argumentsList, target);
        },
      });
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: FaultInjectedAudioContext,
      });
    });
    await page.goto("/synth");

    await page.getByRole("button", { name: "Enable Sound" }).click();
    await expect(page.locator('[data-audio-state="unavailable"]')).toContainText(
      "Every control and its normalized value remains available",
    );
    await page.locator('[data-control-selector="cutoff"]').click();
    await page.getByRole("slider", { name: "CUTOFF value" }).fill("91");
    await expect(page.locator('[data-control-selector="cutoff"]')).toHaveAccessibleName(
      "Open CUTOFF control, current value 91 percent",
    );

    await page.getByRole("button", { name: "Retry sound" }).click();
    await expect(page.locator('[data-audio-state="playing"]')).toContainText(
      "Sound is playing.",
    );
    await expect(page.getByRole("slider", { name: "CUTOFF value" })).toHaveValue(
      "91",
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
