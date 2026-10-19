import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import {
  EDITORIAL_PREVIEW_COOKIE,
  signEditorialPreviewSession,
} from "@/src/editorial/preview-policy";

const previewSecret = "browser-preview-session-secret-32-characters";

test("authenticated Editorial preview is marked, private, non-indexable, and Bag-disabled", async ({
  context,
  page,
}) => {
  const previewProps = JSON.parse(
    readFileSync(
      resolve(process.cwd(), ".next/server/preview-props.json"),
      "utf8",
    ),
  ) as { previewModeId: string };
  const expiresAt = Date.now() + 10 * 60 * 1_000;
  const session = await signEditorialPreviewSession(
    {
      version: 1,
      perspective: ["drafts"],
      studioOrigin: "https://studio.example",
      expiresAt,
    },
    previewSecret,
  );
  expect(session).not.toBeNull();
  if (!session) throw new Error("Failed to create the browser preview session");

  await context.addCookies([
    {
      name: "__prerender_bypass",
      value: previewProps.previewModeId,
      url: "http://127.0.0.1:32142",
    },
    {
      expires: expiresAt / 1_000,
      httpOnly: true,
      name: EDITORIAL_PREVIEW_COOKIE,
      sameSite: "Lax",
      url: "http://127.0.0.1:32142",
      value: session,
    },
  ]);

  const response = await page.goto("/monolith");
  expect(response).not.toBeNull();
  expect(response!.headers()["cache-control"]).toContain("no-store");
  expect(response!.headers()["x-robots-tag"]).toContain("noindex");
  expect(response!.headers()["content-security-policy"]).toContain(
    "frame-ancestors https://www.sanity.io",
  );
  expect(response!.headers()["x-frame-options"]).toBeUndefined();

  await expect(page.getByText("EDITORIAL PREVIEW", { exact: true })).toBeVisible();
  await expect(page.getByText("Private · no-store · Bag disabled")).toBeVisible();
  await expect(page.locator("sanity-visual-editing")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Add MONOLITH to Bag" }).first(),
  ).toBeDisabled();

  await page.setViewportSize({ height: 720, width: 320 });
  await expect(page.getByRole("button", { name: "Exit preview" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);

  await page.getByRole("button", { name: "Exit preview" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("EDITORIAL PREVIEW", { exact: true })).toHaveCount(0);
});

test("Editorial preview answers Sanity Presentation's visual-editing handshake", async ({
  context,
  page,
}) => {
  const previewProps = JSON.parse(
    readFileSync(
      resolve(process.cwd(), ".next/server/preview-props.json"),
      "utf8",
    ),
  ) as { previewModeId: string };
  const expiresAt = Date.now() + 10 * 60 * 1_000;
  const session = await signEditorialPreviewSession(
    {
      version: 1,
      perspective: ["drafts"],
      studioOrigin: "https://studio.example",
      expiresAt,
    },
    previewSecret,
  );
  expect(session).not.toBeNull();
  if (!session) throw new Error("Failed to create the browser preview session");

  await context.addCookies([
    {
      name: "__prerender_bypass",
      value: previewProps.previewModeId,
      url: "https://preview.example",
    },
    {
      expires: expiresAt / 1_000,
      httpOnly: true,
      name: EDITORIAL_PREVIEW_COOKIE,
      sameSite: "None",
      secure: true,
      url: "https://preview.example",
      value: session,
    },
  ]);

  const previewCookieHeader = (await context.cookies("https://preview.example"))
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  await page.route("https://preview.example/**", async (route) => {
    const source = new URL(route.request().url());
    const localTarget = new URL(
      source.pathname + source.search,
      "http://127.0.0.1:32142",
    );
    const response = await route.fetch({
      headers: {
        ...route.request().headers(),
        cookie: previewCookieHeader,
      },
      url: localTarget.href,
    });
    await route.fulfill({ response });
  });
  await page.route("https://www.sanity.io/presentation-harness", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: `<!doctype html>
        <iframe id="preview" src="https://preview.example/monolith"></iframe>
        <script>
          window.presentationMessages = [];
          const preview = document.getElementById("preview");
          const probe = setInterval(() => {
            preview.contentWindow.postMessage({
              domain: "sanity/channels",
              from: "presentation",
              type: "presentation/status"
            }, "https://preview.example");
          }, 100);
          window.addEventListener("message", (event) => {
            window.presentationMessages.push({data: event.data, origin: event.origin});
            if (event.data?.type === "visual-editing/status") clearInterval(probe);
          });
        </script>`,
    });
  });

  await page.goto("https://www.sanity.io/presentation-harness");

  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & {
            presentationMessages: Array<{ data?: { type?: string }; origin: string }>;
          }
        ).presentationMessages.some(
          ({ data, origin }) =>
            origin === "https://preview.example" &&
            data?.type === "visual-editing/status",
        ),
      ),
    )
    .toBe(true);
});
