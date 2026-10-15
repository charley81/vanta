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
    "frame-ancestors https://studio.example",
  );
  expect(response!.headers()["x-frame-options"]).toBeUndefined();

  await expect(page.getByText("EDITORIAL PREVIEW", { exact: true })).toBeVisible();
  await expect(page.getByText("Private · no-store · Bag disabled")).toBeVisible();
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
