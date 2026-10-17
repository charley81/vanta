import { expect, test } from "@playwright/test";

const indexedRoutes = [
  {
    path: "/",
    title: "VANTA — Sound, given mass.",
    canonical: "https://vanta-monolith.netlify.app",
    sitemapUrl: "https://vanta-monolith.netlify.app/",
  },
  {
    path: "/monolith",
    title: "MONOLITH — Hybrid Polyphonic Synthesizer | VANTA",
    canonical: "https://vanta-monolith.netlify.app/monolith",
    sitemapUrl: "https://vanta-monolith.netlify.app/monolith",
  },
  {
    path: "/synth",
    title: "MORPH Lab — Play MONOLITH | VANTA",
    canonical: "https://vanta-monolith.netlify.app/synth",
    sitemapUrl: "https://vanta-monolith.netlify.app/synth",
  },
] as const;

test.describe("discoverability surface", () => {
  test("renders exact unique metadata and dedicated social cards", async ({
    page,
  }) => {
    const descriptions = new Set<string>();
    const socialImages = new Set<string>();

    for (const route of indexedRoutes) {
      const response = await page.goto(route.path);
      expect(response?.headers()["x-robots-tag"]).toBeUndefined();
      await expect(page).toHaveTitle(route.title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        route.canonical,
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        route.canonical,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        route.title,
      );
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      const socialImage = await page
        .locator('meta[property="og:image"]')
        .getAttribute("content");
      expect(socialImage).toMatch(
        /^https:\/\/(?:cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/[^?#]+|vanta-monolith\.netlify\.app\/social\/[^?#]+\.jpg)$/,
      );
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
        "content",
        "1200",
      );
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
        "content",
        "630",
      );
      await expect(page.locator('meta[name="googlebot"]')).toHaveAttribute(
        "content",
        /max-image-preview:large/,
      );
      await expect(page.locator('link[rel="icon"]')).not.toHaveCount(0);
      await expect(page.locator('link[rel="apple-touch-icon"]')).not.toHaveCount(0);

      const description = await page
        .locator('meta[name="description"]')
        .getAttribute("content");
      expect(description).not.toBeNull();
      expect(description!.length).toBeGreaterThanOrEqual(120);
      expect(description!.length).toBeLessThanOrEqual(160);
      descriptions.add(description!);
      socialImages.add(socialImage!);
    }

    expect(descriptions.size).toBe(3);
    expect(socialImages.size).toBe(3);
  });

  test("publishes only the three indexed routes in robots and sitemap", async ({
    request,
  }) => {
    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.ok()).toBe(true);
    const sitemapXml = await sitemapResponse.text();
    const locations = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      ([, location]) => location,
    );
    expect(locations).toEqual(indexedRoutes.map(({ sitemapUrl }) => sitemapUrl));
    expect(sitemapXml).not.toContain("checkout-preview");
    expect(sitemapXml).not.toContain("/api/");

    const robotsResponse = await request.get("/robots.txt");
    expect(robotsResponse.ok()).toBe(true);
    const robotsText = await robotsResponse.text();
    expect(robotsText).toContain("Disallow: /api/");
    expect(robotsText).toContain("Disallow: /checkout-preview");
    expect(robotsText).toContain(
      "Sitemap: https://vanta-monolith.netlify.app/sitemap.xml",
    );
  });

  test("renders sanitized entity data without commerce signals", async ({
    page,
  }) => {
    await page.goto("/");
    const homeData = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ??
        "null",
    ) as { "@graph": Array<{ "@type": string }> };
    expect(homeData["@graph"].map((entity) => entity["@type"])).toEqual([
      "Organization",
      "WebSite",
    ]);

    await page.goto("/monolith");
    const script = page.locator('script[type="application/ld+json"]');
    const productText = (await script.textContent()) ?? "null";
    const productData = JSON.parse(productText) as Record<string, unknown>;
    expect(productData).toMatchObject({
      "@type": "Product",
      name: "MONOLITH",
      model: "MONOLITH",
      category: "Desktop Synthesizer",
      color: "Graphite",
    });
    expect(productText).not.toMatch(
      /"(?:offers|sku|availability|aggregateRating|review|potentialAction|price|priceCurrency)"/i,
    );
    expect(productText).not.toContain("</script>");
  });

  test("uses permanent route redirects and response-level noindex", async ({
    request,
  }) => {
    const trailing = await request.get("/monolith/", { maxRedirects: 0 });
    expect(trailing.status()).toBe(308);
    expect(trailing.headers().location).toBe("/monolith");

    const legacy = await request.get("/product", { maxRedirects: 0 });
    expect(legacy.status()).toBe(308);
    expect(legacy.headers().location).toBe("/monolith");

    for (const path of ["/checkout-preview", "/api/bag", "/missing"] as const) {
      const response = await request.get(path);
      expect(response.headers()["x-robots-tag"], path).toContain("noindex");
    }
  });
});
