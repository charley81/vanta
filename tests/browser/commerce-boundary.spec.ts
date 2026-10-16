import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";

type NetworkEntry = {
  method: string;
  origin: string;
  path: string;
  resourceType: string;
};

type StageInventory = {
  accessibilityViolations: Array<{
    id: string;
    impact: string | null | undefined;
  }>;
  stage: string;
  controls: {
    forms: number;
    inputs: number;
    selects: number;
    textareas: number;
  };
  cookies: Array<{
    expires: number;
    httpOnly: boolean;
    name: string;
    sameSite: string;
    secure: boolean;
  }>;
  localStorageKeys: string[];
  network: NetworkEntry[];
  sessionStorage: Array<[string, unknown]>;
};

function observeNetwork(page: Page): NetworkEntry[] {
  const entries: NetworkEntry[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    entries.push({
      method: request.method(),
      origin: url.origin,
      path: url.pathname,
      resourceType: request.resourceType(),
    });
  });
  return entries;
}

async function inventoryStage(
  page: Page,
  stage: string,
  network: NetworkEntry[],
): Promise<StageInventory> {
  const storage = await page.evaluate(() => ({
    localStorageKeys: Object.keys(localStorage).sort(),
    sessionStorage: Object.entries(sessionStorage)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => {
        try {
          return [key, JSON.parse(value)] as [string, unknown];
        } catch {
          return [key, "[non-json]"] as [string, unknown];
        }
      }),
  }));
  const cookies = (await page.context().cookies()).map((cookie) => ({
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    name: cookie.name,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
  }));
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return {
    accessibilityViolations: accessibility.violations.map(({ id, impact }) => ({
      id,
      impact,
    })),
    stage,
    controls: {
      forms: await page.locator("form").count(),
      inputs: await page.locator("input").count(),
      selects: await page.locator("select").count(),
      textareas: await page.locator("textarea").count(),
    },
    cookies,
    localStorageKeys: storage.localStorageKeys,
    network: [...network],
    sessionStorage: storage.sessionStorage,
  };
}

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(`${JSON.stringify(value, null, 2)}\n`),
    contentType: "application/json",
  });
}

async function addMonolithAndEnterPreview(page: Page) {
  await page.goto("/monolith");
  await page.getByRole("button", { name: "Add MONOLITH to Bag" }).first().click();
  const bag = page.getByRole("dialog", { name: "Bag" });
  await expect(bag).toBeVisible();
  await bag.getByRole("link", { name: "Enter Checkout Preview" }).click();
  await expect(page).toHaveURL(/\/checkout-preview$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
}

function expectDataOnlyInventory(inventory: StageInventory) {
  expect(inventory.accessibilityViolations).toEqual([]);
  expect(inventory.controls).toEqual({
    forms: 0,
    inputs: 0,
    selects: 0,
    textareas: 0,
  });
  expect(inventory.localStorageKeys).toEqual([]);
  expect(inventory.sessionStorage).toHaveLength(1);
  expect(inventory.sessionStorage[0][0]).toBe("vanta:checkout-preview:v1");
  const serialized = JSON.stringify(inventory.sessionStorage[0][1]);
  expect(serialized).not.toMatch(
    /Mara|example\.invalid|Signal Way|identity|address|phone|payment|discount|gift|free.?text/iu,
  );
}

test.describe.serial("commerce-shaped journey boundary", () => {
  test("binds a deployed run to one ready immutable Netlify deployment", async ({
    request,
  }, testInfo) => {
    const deploymentId = String(testInfo.config.metadata.deploymentId);
    const applicationCommit = String(testInfo.config.metadata.applicationCommit);
    if (deploymentId === "local-development-server") {
      await attachJson(testInfo, "qualification-identity", {
        applicationCommit,
        deploymentId,
        environment: "local-production-server",
        acceptanceClaim: false,
      });
      return;
    }

    const response = await request.get(
      `https://api.netlify.com/api/v1/deploys/${deploymentId}`,
    );
    expect(response.status()).toBe(200);
    const deployment = (await response.json()) as Record<string, unknown>;
    expect(deployment.id).toBe(deploymentId);
    expect(deployment.commit_ref).toBe(applicationCommit);
    expect(deployment.state).toBe("ready");
    await attachJson(testInfo, "qualification-identity", {
      applicationCommit,
      deploymentId,
      deployUrl: testInfo.config.metadata.target,
      environment: "immutable-netlify-deployment",
      ready: true,
    });
  });

  test("requires server-confirmed Bag membership and inventories every Preview state", async ({
    page,
  }, testInfo) => {
    const network = observeNetwork(page);
    await page.goto("/checkout-preview");
    await expect(
      page.getByRole("heading", { name: "Checkout Preview needs a confirmed Bag." }),
    ).toBeVisible();

    await addMonolithAndEnterPreview(page);
    const inventories = [await inventoryStage(page, "contact", network)];

    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Delivery" })).toBeFocused();
    inventories.push(await inventoryStage(page, "delivery", network));

    await page.getByRole("button", { name: "Continue to review" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeFocused();
    inventories.push(await inventoryStage(page, "review", network));

    await page.getByRole("button", { name: "Complete preview" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ordering offline" })).toBeFocused();
    inventories.push(await inventoryStage(page, "terminal", network));

    for (const inventory of inventories) expectDataOnlyInventory(inventory);
    const expectedOrigin = new URL(page.url()).origin;
    expect(network.every((entry) => entry.origin === expectedOrigin)).toBe(true);
    expect(
      network
        .filter((entry) => entry.path.startsWith("/api/"))
        .map(({ method, path }) => ({ method, path })),
    ).toEqual([
      { method: "GET", path: "/api/bag" },
      { method: "POST", path: "/api/bag/add" },
      { method: "GET", path: "/api/bag" },
    ]);
    expect(JSON.stringify(network)).not.toMatch(
      /shopify|stripe|paypal|payment|order|fulfill|reserv|authoriz|notification/iu,
    );
    await attachJson(testInfo, "commerce-stage-inventories", {
      candidate: testInfo.config.metadata,
      inventories,
    });
  });

  test("retraces history, recovers interruption, and fails closed after Bag removal", async ({
    page,
  }, testInfo) => {
    const network = observeNetwork(page);
    await addMonolithAndEnterPreview(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.getByRole("button", { name: "Continue to review" }).click();

    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Delivery" })).toBeFocused();
    await page.goForward();
    await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeFocused();

    await page.reload();
    const recovery = page.getByRole("alertdialog", {
      name: "Continue Checkout Preview?",
    });
    await expect(recovery).toBeVisible();
    await expect(recovery.getByRole("button", { name: "Resume Review" })).toBeFocused();
    await recovery.getByRole("button", { name: "Resume Review" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeFocused();

    await page.getByRole("banner").getByRole("button", { name: "Open Bag" }).click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await bag.getByRole("button", { name: "Remove MONOLITH" }).click();
    await expect(bag.getByText("Your Bag is empty.")).toBeVisible();
    await bag.getByRole("button", { name: "Close Bag" }).click();

    await expect(
      page.getByRole("heading", { name: "Checkout Preview needs a confirmed Bag." }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => sessionStorage.getItem("vanta:checkout-preview:v1")),
      )
      .toBeNull();
    await attachJson(testInfo, "history-interruption-removal-network", {
      candidate: testInfo.config.metadata,
      network,
    });
  });

  test("cross-tab changes broadcast invalidation only and require an authoritative refetch", async ({
    context,
    page,
  }, testInfo) => {
    const network = observeNetwork(page);
    const otherTab = await context.newPage();
    await otherTab.goto("/");
    await otherTab.evaluate(() => {
      const messages: unknown[] = [];
      const observer = new BroadcastChannel("vanta:bag-invalidation:v1");
      observer.addEventListener("message", (event) => messages.push(event.data));
      Object.assign(window, {
        __vantaBagQualificationMessages: messages,
        __vantaBagQualificationObserver: observer,
      });
    });
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
    await expect
      .poll(() =>
        otherTab.evaluate(
          () =>
            (window as typeof window & {
              __vantaBagQualificationMessages: unknown[];
            }).__vantaBagQualificationMessages,
        ),
      )
      .toEqual([{ type: "invalidate", version: 1 }]);

    await otherTab.bringToFront();
    await otherTab.getByRole("heading", { level: 1 }).click();
    await expect(otherTrigger).toHaveAttribute("aria-label", "Open Bag, 1 item");

    await page.bringToFront();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await bag.getByRole("button", { name: "Remove MONOLITH" }).click();
    await expect(bag.getByText("Your Bag is empty.")).toBeVisible();
    await expect(otherTrigger).toHaveAttribute("aria-label", "Open Bag, 1 item");
    const messages = await otherTab.evaluate(
      () =>
        (window as typeof window & {
          __vantaBagQualificationMessages: unknown[];
        }).__vantaBagQualificationMessages,
    );
    expect(messages).toEqual([
      { type: "invalidate", version: 1 },
      { type: "invalidate", version: 1 },
    ]);
    expect(JSON.stringify(messages)).not.toMatch(/MONOLITH|Graphite|price|subtotal|expires/iu);

    await otherTab.bringToFront();
    await otherTab.getByRole("heading", { level: 1 }).click();
    await expect(otherTrigger).toHaveAttribute("aria-label", "Open Bag, 0 items");
    await attachJson(testInfo, "cross-tab-invalidation", {
      candidate: testInfo.config.metadata,
      messages,
      network,
    });
  });

  test("a timed-out mutation preserves confirmed state and exposes targeted recovery", async ({
    page,
  }, testInfo) => {
    await page.goto("/monolith");
    await page.getByRole("button", { name: "Add MONOLITH to Bag" }).first().click();
    const bag = page.getByRole("dialog", { name: "Bag" });
    await expect(bag.getByText("Graphite / Quantity 1")).toBeVisible();
    await page.route("**/api/bag/remove", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6_000));
      await route.fulfill({ json: { delayed: true } });
    });

    await page.evaluate(() => {
      const startedAt = performance.now();
      const observer = new MutationObserver(() => {
        if (!document.body.textContent?.includes("The Bag request timed out.")) return;
        document.documentElement.dataset.bagTimeoutFeedback = String(
          performance.now() - startedAt,
        );
        observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    await bag.getByRole("button", { name: "Remove MONOLITH" }).click();
    await expect(bag.getByText("The Bag request timed out.")).toBeVisible({
      timeout: 5_200,
    });
    const feedbackMilliseconds = await page.evaluate(() =>
      Number(document.documentElement.dataset.bagTimeoutFeedback),
    );
    expect(feedbackMilliseconds).toBeLessThan(5_000);
    await expect(bag.getByText("Graphite / Quantity 1")).toBeVisible();
    await expect(bag.getByRole("button", { name: "Retry remove" })).toBeVisible();

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await bag.getByRole("button", { name: "Retry remove" }).click();
    await expect(bag.getByText("Your Bag is empty.")).toBeVisible();
    await attachJson(testInfo, "timeout-recovery", {
      candidate: testInfo.config.metadata,
      feedbackMilliseconds,
      preservedConfirmedItem: true,
      retryResult: "empty",
    });
  });

  test("malformed, expired, and tampered state all fail closed", async ({
    context,
    page,
  }, testInfo) => {
    await addMonolithAndEnterPreview(page);
    await page.getByRole("button", { name: "Continue to delivery" }).click();
    await page.evaluate(() => {
      sessionStorage.setItem("vanta:checkout-preview:v1", "{");
      window.history.replaceState(
        {
          ...window.history.state,
          __vantaCheckoutPreview: { version: 1, stage: "terminal", depth: 3 },
        },
        "",
        window.location.href,
      );
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    await page.evaluate(() => {
      sessionStorage.setItem(
        "vanta:checkout-preview:v1",
        JSON.stringify({
          version: 1,
          reachedStage: "contact",
          activeStage: "review",
          completed: false,
          lastMeaningfulActivityAt: Date.now(),
        }),
      );
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Review", exact: true })).toBeDisabled();

    await page.evaluate(() => {
      sessionStorage.setItem(
        "vanta:checkout-preview:v1",
        JSON.stringify({
          version: 1,
          reachedStage: "delivery",
          activeStage: "delivery",
          completed: false,
          lastMeaningfulActivityAt: Date.now() - 30 * 60 * 1_000 - 1,
        }),
      );
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeFocused();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    const bagCookie = (await context.cookies()).find(
      (cookie) => cookie.name === "__Host-vanta_bag",
    );
    expect(bagCookie).toBeDefined();
    const [payload, signature] = bagCookie!.value.split(".");
    const tamperedSignature = `${signature.at(0) === "A" ? "B" : "A"}${signature.slice(1)}`;
    await context.addCookies([
      {
        ...bagCookie!,
        value: `${payload}.${tamperedSignature}`,
      },
    ]);
    await page.goto("/checkout-preview");
    await expect(
      page.getByRole("heading", { name: "Checkout Preview needs a confirmed Bag." }),
    ).toBeVisible();
    expect(
      (await context.cookies()).some(
        (cookie) => cookie.name === "__Host-vanta_bag",
      ),
    ).toBe(false);
    await attachJson(testInfo, "malformed-and-tampered-state", {
      candidate: testInfo.config.metadata,
      malformedPreviewResult: "fresh-contact",
      impossiblePreviewResult: "fresh-contact",
      inactivityExpiryResult: "fresh-contact",
      tamperedCookieResult: "empty-and-cleared",
    });
  });

  test("Bag endpoints reject abuse and preserve replay and idempotency guarantees", async ({
    request,
  }, testInfo) => {
    const origin = new URL(testInfo.project.use.baseURL as string).origin;
    const outcomes: Array<{ case: string; status: number }> = [];
    const record = (caseName: string, response: { status(): number }) => {
      const outcome = { case: caseName, status: response.status() };
      outcomes.push(outcome);
      return outcome.status;
    };

    const queryInjection = await request.get(
      "/api/bag?quantity=99&identity=%3Cscript%3E&price=1",
    );
    expect(record("query-injection", queryInjection)).toBe(400);

    const crossOrigin = await request.post("/api/bag/add", {
      data: {},
      headers: { origin: "https://attacker.invalid" },
    });
    expect(record("cross-origin", crossOrigin)).toBe(403);

    const schemaInjection = await request.post("/api/bag/add", {
      data: { quantity: 99, value: "<script>" },
      headers: { origin },
    });
    expect(record("schema-injection", schemaInjection)).toBe(400);

    const malformedJson = await request.post("/api/bag/add", {
      data: "{",
      headers: { "content-type": "application/json", origin },
    });
    expect(record("malformed-json", malformedJson)).toBe(400);

    const unsupportedMedia = await request.post("/api/bag/add", {
      data: "{}",
      headers: { "content-type": "text/plain", origin },
    });
    expect(record("unsupported-media", unsupportedMedia)).toBe(415);

    const oversized = await request.post("/api/bag/add", {
      data: { padding: "x".repeat(100) },
      headers: { origin },
    });
    expect(record("oversized-body", oversized)).toBe(413);

    const oversizedCookie = await request.get("/api/bag", {
      headers: { cookie: `__Host-vanta_bag=${"x".repeat(1_025)}` },
    });
    expect(record("oversized-cookie", oversizedCookie)).toBe(200);
    await expect(oversizedCookie.json()).resolves.toMatchObject({
      item: null,
      expiresAt: null,
    });
    expect(oversizedCookie.headers()["set-cookie"]).toContain("Max-Age=0");

    const added = await request.post("/api/bag/add", {
      data: {},
      headers: { origin },
    });
    expect(record("add", added)).toBe(200);
    const firstSnapshot = await added.json();
    const replayedAdd = await request.post("/api/bag/add", {
      data: {},
      headers: { origin },
    });
    expect(record("replayed-add", replayedAdd)).toBe(200);
    expect(await replayedAdd.json()).toEqual(firstSnapshot);
    const addedCookieParts = added.headers()["set-cookie"].split("; ");
    const replayedCookieParts = replayedAdd.headers()["set-cookie"].split("; ");
    expect(replayedCookieParts[0]).toBe(addedCookieParts[0]);
    expect(replayedCookieParts.find((part) => part.startsWith("Expires="))).toBe(
      addedCookieParts.find((part) => part.startsWith("Expires=")),
    );
    expect(
      Number(replayedCookieParts.find((part) => part.startsWith("Max-Age="))?.split("=")[1]),
    ).toBeLessThanOrEqual(
      Number(addedCookieParts.find((part) => part.startsWith("Max-Age="))?.split("=")[1]),
    );

    const removed = await request.post("/api/bag/remove", {
      data: {},
      headers: { origin },
    });
    expect(record("remove", removed)).toBe(200);
    const emptySnapshot = await removed.json();
    const replayedRemove = await request.post("/api/bag/remove", {
      data: {},
      headers: { origin },
    });
    expect(record("replayed-remove", replayedRemove)).toBe(200);
    expect(await replayedRemove.json()).toEqual(emptySnapshot);

    let rateLimitedResponse: Awaited<ReturnType<typeof request.post>> | null = null;
    let acceptedBurstRequests = 0;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      const response = await request.post("/api/bag/add", {
        data: {},
        headers: { origin },
      });
      if (response.status() === 429) {
        rateLimitedResponse = response;
        break;
      }
      expect(response.status()).toBe(200);
      acceptedBurstRequests += 1;
    }
    expect(acceptedBurstRequests).toBeGreaterThan(0);
    expect(rateLimitedResponse).not.toBeNull();
    expect(Number(rateLimitedResponse!.headers()["retry-after"])).toBeGreaterThan(0);
    outcomes.push({ case: "mutation-burst", status: 429 });

    await attachJson(testInfo, "restricted-endpoint-security", {
      acceptedBurstRequests,
      candidate: testInfo.config.metadata,
      outcomes,
      replayedAddPreservedExpiry: true,
      replayedRemoveStayedEmpty: true,
    });
  });
});
