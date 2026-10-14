# Sanity content delivery in Next.js 16.4 on Netlify

**Research date:** 2026-10-14  
**Decision context:** [Issue #1](https://github.com/charley81/vanta/issues/1) and [issue #6](https://github.com/charley81/vanta/issues/6)  
**Source boundary:** Installed Next.js 16.4 documentation/source, current official Sanity documentation and package source, and current official Netlify documentation/OpenNext adapter source only.

## Executive answer

The repository can support Sanity drafts, Presentation Tool visual editing, live content, on-demand revalidation, Partial Prerendering, and responsive Sanity images on Netlify without a custom server. The important constraint is that this is a **Next.js 16 Cache Components application**, not an application using the older route-level caching model: `cacheComponents: true` and `partialPrefetching: true` are already enabled, and Next.js 16 removes the `dynamic`, `revalidate`, `fetchCache`, and `dynamicParams` page/layout exports in this mode ([installed Next.js 16.4 route-config docs](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.mdx)).

**Recommendation:** use `next-sanity` v13's Cache Components integration as the primary architecture:

1. Published Sanity data is fetched in explicit `use cache` boundaries through `defineLive().sanityFetch`, with the `published` perspective and stega disabled.
2. Request-only preview state (`draftMode()`, perspective cookies, route params) is resolved outside those boundaries and passed in as serializable values—the documented three-layer pattern.
3. Draft Mode uses Sanity's validated preview-secret route, the requested draft/release perspective, a server-only Viewer token, uncached Sanity API reads, and Visual Editing only in the preview session.
4. `<SanityLive />` is mounted once in the website route group, not in an embedded Studio or interaction-only route that does not need live content.
5. For deterministic production publishing, add a Sanity Sync Tag Invalidate Function (or, second choice, a signed webhook) that calls a Netlify-hosted Route Handler and invalidates the exact Next cache tags. Do **not** treat a browser's live subscription as the only production invalidation path.
6. Deliver editorial images directly from Sanity's image CDN with `@sanity/image-url` and a Sanity-aware image loader. This avoids sending every image through both Sanity transformation and Netlify Image CDN. The current `next-sanity/image` wrapper provides that pattern, but it is explicitly alpha, so isolate it behind an application image component.

This keeps the boundary from issue #1 intact: Sanity owns editable editorial copy and media; code owns route composition, choreography, audio/3D behavior, mandatory concept-product disclosures, and the approved GLB. Server Components should convert Sanity documents into narrow view models before passing data to long-lived client islands.

## Repository baseline

### Documented/observed facts

- The app currently installs `next@16.4.0`, `react@19.3.0`, and `react-dom@19.3.0`. It does not yet install Sanity or Netlify packages.
- `next.config.ts` enables both `cacheComponents` and `partialPrefetching`.
- `next-sanity` v13 is the supported line for this combination. Sanity's current live-content guide says v13 requires Next.js 16, React 19.2+, and `@sanity/client` 7.26.1+; its visual-editing guide also requires Node.js 22.12+ ([Live Content guide](https://www.sanity.io/docs/developer-guides/live-content-guide), [Visual Editing guide](https://www.sanity.io/docs/visual-editing/visual-editing-with-next-js-app-router)). The current package release is [`next-sanity@13.3.4`](https://github.com/sanity-io/next-sanity/releases/tag/next-sanity%4013.3.4).
- Netlify documents full support for App Router, Draft Mode, Cache Components, PPR, ISR, Server Components, Route Handlers, Server Actions, streaming, Turbopack builds, and image optimization through its OpenNext adapter ([Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)).

### Recommendation

Pin the application's Node requirement to at least 22.12 in repository/deployment configuration instead of relying on a site's historical Netlify default. Netlify normally makes the Functions runtime match the build's Node version, and supports selecting it through the UI, `NODE_VERSION`, `.node-version`, or `.nvmrc` ([Netlify dependency management](https://docs.netlify.com/build/configure-builds/manage-dependencies/#node-js-and-javascript)). Keep `next-sanity` on one reviewed v13 release and test upgrades in both published and Draft Mode.

## 1. Published, draft, and release content

### Sanity perspectives are the content-security boundary

**Documented facts:**

- `published` excludes unpublished changes; `drafts` overlays drafts and includes never-published documents; `raw` returns draft/version/published documents side by side to authenticated callers. Since API version `2025-02-19`, `published` is the default, but it should still be explicit. Draft and stacked release perspectives require authentication and bypass Sanity's API CDN ([Sanity perspectives](https://www.sanity.io/docs/content-lake/perspectives)).
- The Presentation Tool may request a **stacked release perspective**, not only `drafts`. The current preview integration stores that requested perspective in a cookie; hardcoding `drafts` would make Content Release preview incorrect ([implementing Draft Mode](https://www.sanity.io/docs/visual-editing/implementing-draft-mode)).
- For direct `client.fetch` calls, Sanity's matrix says `useCdn: true` for public/browser and high-traffic published reads, but `false` for static-generation reads that must be build-fresh, webhook-triggered regeneration, and preview. `defineLive().sanityFetch` controls this itself: published uses the CDN; non-published perspectives bypass it ([client configuration](https://www.sanity.io/docs/nextjs/configure-sanity-client-nextjs), [`defineLive` source](https://github.com/sanity-io/next-sanity/blob/b08c4e32306e19f9b046239660df7b339d9031ff/packages/next-sanity/src/live/conditions/next-js/defineLive.tsx#L295-L342)).

**Recommendation:** expose one application fetch API that requires the caller to supply `perspective` and `stega` (`strict: true` in `defineLive`). Use `published`/`false` for normal traffic and derive the preview perspective from the validated cookie for Draft Mode. Do not let arbitrary request input select a perspective or stega mode.

### Draft Mode behavior and secure activation

**Documented facts:**

- Next.js Draft Mode sets `__prerender_bypass`. In Next.js 16.4, a draft request bypasses the fetch cache, `use cache`, `unstable_cache`, and the ISR response cache; the response is `private, no-cache, no-store`. Other visitors still receive published cached output. The bypass-cookie value changes on every build ([Next.js Draft Mode guide](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/02-guides/draft-mode.mdx)).
- Sanity's Presentation Tool creates a cryptographic preview secret, stores it in the dataset, and sends it to the enable endpoint. Ordinary secrets expire after one hour. `defineEnableDraftMode` validates the request before enabling Next Draft Mode; current package source also sets `SameSite=None`, `Secure`, and CHIPS `Partitioned` cookies for cross-site iframes so Safari 18.4+ can retain preview state ([Sanity Draft Mode guide](https://www.sanity.io/docs/visual-editing/implementing-draft-mode), [`defineEnableDraftMode` source](https://github.com/sanity-io/next-sanity/blob/b08c4e32306e19f9b046239660df7b339d9031ff/packages/next-sanity/src/draft-mode/define-enable-draft-mode.ts)).
- Draft/release reads need a token. Sanity recommends a Viewer token. `serverToken` performs server draft reads; `browserToken` is sent to the browser only when draft live preview is enabled, and therefore must be read-only and minimally scoped ([client configuration](https://www.sanity.io/docs/nextjs/configure-sanity-client-nextjs)).
- Visual Editing's stega characters belong only in visible content. They can corrupt metadata, JSON-LD, URLs, attributes, string comparisons, dates, scripts, and styles. Sanity requires `stega: false` (or `stegaClean`) for metadata, sitemap, OG generation, and other non-display uses ([client/stega guide](https://www.sanity.io/docs/visual-editing/visual-editing-client-stega)).

**Production requirements:**

1. Use `defineEnableDraftMode`; do not expose an unvalidated generic `draftMode().enable()` URL.
2. Keep `SANITY_API_READ_TOKEN` server-only—never use a `NEXT_PUBLIC_` prefix. Treat the browser token as disclosed to every authorized/shared-preview browser and limit its role accordingly.
3. Serve production preview over HTTPS. Configure the frontend origin in Sanity CORS with credentials, and configure the Presentation Tool's `allowOrigins` and `previewUrl` for that origin ([Presentation Tool configuration](https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool)).
4. Permit the Studio origin in the frontend's CSP `frame-ancestors`; do not emit an incompatible `X-Frame-Options` header. Sanity explicitly identifies iframe restrictions as a production failure mode ([Presentation Tool configuration](https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool#troubleshooting)).
5. Render `<VisualEditing />` only in Draft Mode. Mount exactly one `<SanityLive />` and one `<VisualEditing />`; Sanity describes multiple instances as undefined behavior ([Cache Components guide](https://www.sanity.io/docs/nextjs/cache-components)).
6. Provide an explicit exit action. A POST Server Action/Route Handler is semantically preferable; if a GET exit URL is retained, do not invoke it with a prefetched Next `<Link>` because prefetch can clear the cookie early ([Next.js Draft Mode guide](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/02-guides/draft-mode.mdx)).

**Deployment-preview constraint:** Netlify branch/PR URLs change. Sanity warns never to allow credentialed `https://*.netlify.app`; that would trust every Netlify site. Prefer an owned wildcard such as `*.previews.example.com`, or scope the Netlify pattern to this site's immutable name (`https://*--site-name.netlify.app`). Public repositories add another risk: a fork preview under a credentialed site wildcard can execute as a logged-in editor, so fork previews should be disabled or pointed to a separate non-production Sanity project ([Sanity CORS configuration](https://www.sanity.io/docs/content-lake/cors)).

**Operational consequence:** a deployment changes Next's Draft Mode bypass value. Editors with an old preview cookie may need to reopen Presentation Tool after a deploy; this is expected rather than evidence that Sanity drafts were lost.

## 2. Cache Components integration

### Required three-layer shape

**Documented fact:** With `cacheComponents: true`, request-time APIs such as `cookies()`, `headers()`, `draftMode()`, and unresolved request params cannot be read inside a `use cache` boundary (except that `draftMode().isEnabled` itself is specially readable). Sanity's v13 guide therefore requires:

1. a page/layout orchestrator,
2. a non-cached dynamic layer that resolves Draft Mode, perspective cookies, and params, and
3. a cached layer receiving only serializable values and calling `sanityFetch`.

Every async function calling v13 `sanityFetch` should have `use cache` or a supported remote cache directive. `sanityFetch` calls `cacheTag()` and `cacheLife()` internally but deliberately does **not** create the boundary ([Sanity Cache Components guide](https://www.sanity.io/docs/nextjs/cache-components), [`defineLive` source](https://github.com/sanity-io/next-sanity/blob/b08c4e32306e19f9b046239660df7b339d9031ff/packages/next-sanity/src/live/conditions/next-js/defineLive.tsx#L303-L342)).

For a route that can be statically rendered, branch early:

- published request -> cached content with `{perspective: 'published', stega: false}`;
- Draft Mode -> dynamic wrapper under `Suspense`, which resolves the actual perspective/stega and then invokes the same cached content component.

This preserves a published static shell while Draft Mode still bypasses that cache. Dynamic `[slug]` routes should use `generateStaticParams` for known published pages and keep params resolution outside the cache boundary. Metadata should use the preview perspective when appropriate but always disable stega ([Sanity Cache Components guide](https://www.sanity.io/docs/nextjs/cache-components)).

### Cache lifetime and scope

**Documented facts:**

- Next.js 16's `use cache` is opt-in and should have an explicit `cacheLife`; long-lived CMS content with webhook/event invalidation is the framework's recommended use case for `cacheTag` plus a long lifetime ([Next.js caching](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/01-getting-started/08-caching.mdx), [revalidating](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/01-getting-started/09-revalidating.mdx)).
- `next-sanity` v13's Sanity cache profile sets server revalidation to 365 days because live/on-demand invalidation is meant to provide freshness. The Sanity guide also replaces the app's default cache profile with this preset so enclosing boundaries do not retain Next's implicit 15-minute revalidation ([preset source](https://github.com/sanity-io/next-sanity/blob/b08c4e32306e19f9b046239660df7b339d9031ff/packages/next-sanity/src/live/cache-life.ts), [setup guide](https://www.sanity.io/docs/nextjs/cache-components#1-configure-nextconfigts)).
- Runtime `use cache` entries are in-memory by default and may not survive across serverless requests. They still inform prerendering, static-shell composition, prefetching, and client stale times. Build/prerendered route output is a different platform cache ([Next.js `use cache`](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/03-api-reference/01-directives/use-cache.mdx#runtime-caching-considerations)).
- The current Netlify adapter's Next 16 `DefaultCache` handler keeps function/component values in a per-process 50 MB LRU, while persisting tag invalidation state in strongly consistent regional blob storage and purging matching edge-cache tags. It does not register a `RemoteCache` handler in the current source ([use-cache handler](https://github.com/opennextjs/opennextjs-netlify/blob/36cf34c6031a8a5b02587fd9d45edecddc6e60d8/src/run/handlers/use-cache-handler.ts), [tag handler](https://github.com/opennextjs/opennextjs-netlify/blob/36cf34c6031a8a5b02587fd9d45edecddc6e60d8/src/run/handlers/tags-handler.cts#L215-L308)).
- Every Next cache entry is deployment/build scoped. A new deploy gets a new build ID and cannot reuse prior `use cache` values ([Next.js caching](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/01-getting-started/08-caching.mdx#where-cached-content-is-stored)).

**Recommendations:**

- Use ordinary `use cache` for Sanity content intended to join the static shell. Do not assume it is a durable cross-invocation key/value cache when the content is deferred to request time on Netlify.
- Do not adopt `use cache: remote` on the assumption that Netlify supplies remote persistence; current adapter source does not. A custom remote handler would be a separate architectural dependency and must be validated on Netlify.
- Keep cache keys low-cardinality: query, stable params such as slug, perspective, and stega. Never key a shared cache by preview token or user session.
- Treat the Sanity CDN, Next function cache, route/edge cache, and client router cache as distinct layers when diagnosing staleness.

## 3. Live content and production invalidation

### What `<SanityLive />` does—and does not guarantee

**Documented facts:**

- `sanityFetch` obtains Content Lake sync tags, prefixes them with `sanity:`, and adds them to the active Next cache entry. `<SanityLive />` subscribes to the Live Content API and reacts when an event's tags intersect those query tags ([Live Content guide](https://www.sanity.io/docs/developer-guides/live-content-guide), [`defineLive` source](https://github.com/sanity-io/next-sanity/blob/b08c4e32306e19f9b046239660df7b339d9031ff/packages/next-sanity/src/live/conditions/next-js/defineLive.tsx#L321-L388)).
- In `next-sanity` v13 production, the default published-content action uses `revalidateTag(tag, 'max')`, which is stale-while-revalidate, then refreshes the observing client. In Draft Mode it skips cache invalidation because Draft Mode already bypasses cache and refreshes the router. Sanity explicitly says default live updates are eventually consistent and may require navigation/refresh for some connected visitors ([v12-to-v13 migration](https://github.com/sanity-io/next-sanity/blob/b08c4e32306e19f9b046239660df7b339d9031ff/packages/next-sanity/MIGRATE-v12-to-v13.md#replace-the-revalidatesynctags-prop-on-sanitylive-with-action)).
- A browser subscription cannot invalidate anything when no browser is connected. With a 365-day fallback lifetime, using `<SanityLive />` alone is not an adequate publishing SLA.
- Sanity's recommended guaranteed-update pattern is a Sync Tag Invalidate Function calling an authenticated app Route Handler, paired with `<SanityLive waitFor="function">`. The handler must add the `sanity:` prefix before calling `revalidateTag` ([Live Content guide](https://www.sanity.io/docs/developer-guides/live-content-guide#enable-the-sanitylive-component), [migration example](https://github.com/sanity-io/next-sanity/blob/b08c4e32306e19f9b046239660df7b339d9031ff/packages/next-sanity/MIGRATE-v12-to-v13.md#opting-in-to-guaranteed-live-content-updates)).

### Next.js invalidation semantics

**Documented facts:**

- `revalidateTag(tag, 'max')` marks matching entries stale. The next request receives stale content while regeneration happens in the background. The call itself does not eagerly regenerate every page.
- `revalidateTag(tag, {expire: 0})` makes the next read block for fresh content. It is available in a Route Handler and is the appropriate immediate-expiration form when an external system—not a Server Action—triggers invalidation.
- `updateTag` immediately expires content but is Server-Action-only and intended for read-your-own-writes. A Sanity webhook/Function Route Handler cannot use it.
- `revalidatePath` affects one route tree; `revalidateTag` affects every page consuming the tagged data. Next recommends tag invalidation when possible because it is more precise about shared dependencies ([Next.js `revalidateTag`](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/03-api-reference/04-functions/revalidateTag.mdx), [revalidating guide](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/01-getting-started/09-revalidating.mdx)).

### Supported production patterns

| Pattern | Supported behavior | Appropriate boundary | Main risk |
| --- | --- | --- | --- |
| **v13 Sanity Live + Sync Tag Function** | Fine-grained query-derived sync tags; browser live updates; server-triggered invalidation even with no connected visitor | Best default for editable public content and Presentation preview | More moving pieces; Route Handler secret and function delivery need monitoring |
| **v13 Sanity Live only** | Real-time subscription while someone is connected; default SWR invalidation | Preview, prototypes, or content with no strict publish SLA | A publish can remain cached when nobody is connected; not instant for all visitors |
| **Signed Sanity webhook + manual cache tags** | `parseBody` validates signatures; Route Handler calls `revalidateTag` or `revalidatePath` | Mostly static sites or teams that want explicit type/path rules | Manual tags can miss transitive references, slug changes, and shared settings |
| **Time-based `cacheLife` only** | Background refresh on request after interval | A safety fallback | Bounded but intentional staleness; needless API requests when content did not change |
| **Uncached request-time reads** | Every request reads Sanity (published reads may still use Sanity CDN) | Truly request-specific data only | Function latency, origin/API load, no static content benefit |

**Recommendation:** choose the first pattern. Use `'max'` SWR when a brief stale response is acceptable and availability matters most. Use `{expire: 0}` only for content whose correctness requirement is stronger than stale-while-revalidate latency. Add a bounded time-based fallback only if the publishing SLA requires recovery from a failed event pipeline.

If webhooks are selected instead, use `next-sanity/webhook`'s `parseBody`, a strong secret, POST, input validation, and rate limiting. Its default three-second wait exists to avoid regenerating against Content Lake before propagation completes. For webhook-driven reads, Sanity recommends `useCdn: false` so a freshly regenerated page does not refill Next's cache with a stale Sanity-CDN response ([webhook guide](https://www.sanity.io/docs/nextjs/validating-sanity-webhooks-nextjs), [client configuration](https://www.sanity.io/docs/nextjs/configure-sanity-client-nextjs#choose-between-the-api-cdn-and-the-live-api)).

## 4. Image delivery

### Supported choices

#### A. Direct Sanity image CDN through a Sanity-aware Next loader — recommended

`@sanity/image-url` turns the complete image object into a URL while respecting editor crop and hotspot. `next-sanity/image` wraps `next/image`, generates responsive `srcset` values, adds `auto=format`, maps quality to Sanity's URL, preserves aspect ratio, and sends requests directly to Sanity's CDN. It does not require `remotePatterns` and does not invoke Netlify's image proxy ([Sanity Next image component](https://www.sanity.io/docs/nextjs/next-sanity-image-component)).

**Risk:** that wrapper is currently marked alpha. Put it behind a local `EditorialImage` component so it can be replaced without touching page code. A lower-risk variant is a small application-owned loader using stable `@sanity/image-url`, plus `next/image`, or explicit `<picture>/<img>` markup.

#### B. Default `next/image` through Netlify Image CDN

Netlify rewrites the default Next image endpoint to `/.netlify/images`, and maps Next `remotePatterns` into Netlify's remote-image allowlist ([adapter source](https://github.com/opennextjs/opennextjs-netlify/blob/36cf34c6031a8a5b02587fd9d45edecddc6e60d8/src/build/image-cdn.ts), [Netlify Image CDN](https://docs.netlify.com/build/image-cdn/overview/)). This is supported, but a Sanity source then passes through two image systems. It can be reasonable if the project standardizes every source behind Netlify, but it adds a second cache/transformation layer without adding Sanity hotspot semantics by itself.

If this option is used, configure a strict object-form `remotePatterns` rule for `https://cdn.sanity.io/images/<project>/<dataset>/**`. Omit the `search` property so Sanity transformation query parameters are allowed; do not use a broad shared-host rule. Netlify never forwards `Authorization` or `Cookie` to remote images, but Sanity dataset assets are public by URL anyway ([Next image security/configuration](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/03-api-reference/02-components/image.mdx#remotepatterns), [Netlify remote image rules](https://docs.netlify.com/build/image-cdn/overview/#remote-path)).

### Image constraints and risks

- Sanity dataset assets are always public on the asset CDN, even for a private dataset. URLs contain a content hash and are difficult to guess, but anyone with the URL can fetch the asset. Do not store confidential preview-only media there ([Sanity image transformations](https://www.sanity.io/docs/apis-and-sdks/image-urls#the-anatomy-of-the-image-url)).
- Use a finite design-system set of integer widths/crops. Sanity says every unique transformation is edge-cached and warns that unconstrained variants and non-integer dimensions hurt performance ([image transformations](https://www.sanity.io/docs/apis-and-sdks/image-urls)).
- Always provide `sizes` for responsive fill/fluid images; otherwise the browser assumes `100vw` and may download oversized assets ([Next Image docs](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/03-api-reference/02-components/image.mdx#sizes)).
- Keep alt text in the editorial schema and preserve empty alt text for decorative imagery. Do not stega-encode image `src`, dimensions, or metadata.
- Use deterministic JPEG URLs for Open Graph images rather than `auto=format`; Sanity notes that social crawlers vary in modern-format support and cache failed previews ([Sanity image transformations](https://www.sanity.io/docs/apis-and-sdks/image-urls#troubleshooting-images-for-social-and-open-graph-previews)).
- Do not put the approved product GLB through an image pipeline. Keep product geometry/code-owned as required by issue #1; Sanity's image API should own editorial raster media, crops, and metadata.

## 5. Netlify execution and deployment constraints

### Documented platform behavior

- No manually installed adapter is required. Netlify auto-detects modern Next.js and recommends not pinning its adapter so each build receives compatibility updates. Pinning `@netlify/plugin-nextjs` opts out of those automatic updates ([Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/#reverting-to-an-older-adapter-version)).
- Support confidence is asymmetric: Netlify reports full support and testing for every stable Next release, but the installed Next.js 16.4 docs still classify Netlify as a provider-owned integration that is not built on the public Adapter API and is not verified by the Next.js team, so compatibility may vary ([Next.js 16.4 deployment docs](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/01-getting-started/17-deploying.mdx#other-platforms)). Treat every Next/adapter change as a deployed qualification event rather than relying on either claim alone.
- The adapter provisions a **regional serverless Netlify Function** for SSR, ISR, PPR, Route Handlers, API routes, and Server Actions; Middleware is a Netlify Edge Function. It configures Full Route/Data cache behavior and path/tag invalidation ([Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/#what-the-adapter-does)).
- A Next route declaring Edge runtime still executes in the Functions region using Node.js on Netlify. No functionality is lost, but it is not edge-local. Avoid an Edge declaration for Sanity routes unless another platform need justifies it ([Netlify limitations](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/#limitations)).
- Netlify says pre-rendered pages are kept in the Next route cache and fetched through a function invocation on first access after a deploy. Account for a first-hit invocation/cold-path even for SSG output ([support matrix](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/#nextjs-support-on-netlify)).
- The generated server function remains subject to Netlify's function envelope: 60-second synchronous execution, 1 GB default memory, 6 MB buffered request/response payloads, and 20 MB streamed responses. Sanity queries, webhook payloads, and rendered responses must remain comfortably inside those limits ([Netlify Functions configuration](https://docs.netlify.com/build/functions/configuration/#default-deployment-options)).
- Netlify supports the PPR model required by Cache Components. Next requires a platform to update the shell and postponed state atomically during revalidation; Netlify's statement of full PPR/Cache Components support is the platform contract for that behavior ([Next PPR adapter requirements](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/02-guides/ppr-platform-guide.mdx), [Netlify support matrix](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/#nextjs-support-on-netlify)).
- Pure `output: 'export'` is not a viable single deployment for per-request Draft Mode, Route Handlers, Server Actions, ISR, or revalidation. Sanity documents a separate SSR preview deployment as the escape hatch for a deliberately static production export ([Sanity Draft Mode and static generators](https://www.sanity.io/docs/visual-editing/implementing-draft-mode#static-site-generators)). The current app does not need that split because Netlify supports the full runtime.

### Deployment configuration required

Set these per Netlify context as appropriate:

- public: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, optionally public Studio URL;
- secret/runtime: `SANITY_API_READ_TOKEN` and the Sync Tag Function or webhook validation secret;
- Node: a pinned compatible version (22.12+);
- Studio: production/preview frontend URL, `allowOrigins`, and matching Sanity CORS origin with credentials.

Build-time rendering requires Sanity to be reachable during `next build`; runtime Draft Mode and cache misses require it to be reachable from the Netlify Functions region. Store secrets through the Netlify UI, CLI, or API rather than `netlify.toml`; values needed during prerendering and by runtime handlers need both **Builds** and **Functions** scope ([Netlify framework environment variables](https://docs.netlify.com/build/frameworks/use-environment-variables-with-frameworks/#setting-variables-for-use-with-server-side-rendering)). Next also warns that sources needed at build time must remain available at request time for dynamic crawler rendering, or those crawler requests can receive 500s ([Next caching: bots and crawlers](https://github.com/vercel/next.js/blob/e273d5b2e869d0be06c0e86f788e1594f9dd40cf/docs/01-app/01-getting-started/08-caching.mdx#bots-and-crawlers)).

**Recommendation:** do not pin the Netlify adapter initially, following Netlify's guidance, but run a deployed smoke suite after every production build because the adapter can change independently of the lockfile. If strict deployment reproducibility later outweighs automatic compatibility fixes, pin deliberately and create an adapter-update cadence.

## 6. Recommended application boundary

### Route/layout boundary

Use a `(website)` route group with one live-content layout:

- `<SanityLive includeDrafts={isDraftMode}>` once;
- `<VisualEditing />` only when Draft Mode is enabled;
- no `SanityLive` under an embedded `/studio` route;
- no public live subscription on routes that have no editable content.

If Studio is deployed separately, the public application remains smaller and Studio deploys independently, at the cost of explicit URL/CORS/CSP management. Embedding Studio is also supported, but it must be excluded from the live-content layout because Sanity warns that putting `<SanityLive />` around an embedded Studio can cause unexpected reloads ([Live Content guide](https://www.sanity.io/docs/developer-guides/live-content-guide#enable-the-sanitylive-component)). For this application, a separately deployed Studio is the cleaner production boundary.

### Data boundary

- Keep GROQ queries and Sanity transport in a server-only `sanity/` module.
- Return page-specific, serializable view models rather than raw documents to client components.
- Keep published and preview fetch modes in the same query path; vary only validated perspective/stega inputs.
- Keep all metadata/SEO/JSON-LD generation stega-free.
- Keep mandatory MONOLITH concept disclosures in code, not solely in client-editable Sanity content, because issue #1 defines them as mandatory.
- Keep 3D/audio/client interaction state below stable client boundaries. A Sanity router refresh should update editorial props without remounting the synth/audio engine or resetting a critical interaction.

### Freshness policy

Suggested policy (recommendation, not a framework requirement):

- **Draft preview:** uncached, live refresh, draft/release perspective.
- **Published editorial pages:** static/PPR shell, Sanity sync tags, `revalidateTag(..., 'max')` from a Sync Tag Function.
- **Mandatory global content:** tag at both document and global-settings level; use `{expire: 0}` only where a stale legal/disclosure value is unacceptable.
- **Fallback:** a documented bounded time revalidation or an operational replay mechanism for failed function events.

## 7. Risks and verification gates

| Risk | Why it is real | Required control |
| --- | --- | --- |
| Preview leaks drafts | Viewer/browser token and `drafts` perspective can read unpublished content | Validated enable route, least-privilege token, trusted credentialed origins only, no public token prefix |
| Netlify preview wildcard trusts attacker code | Netlify PR URLs are variable and credentialed CORS permits authenticated requests | Owned custom preview domain or site-scoped wildcard; isolate/disable fork previews |
| “Live” publish remains stale | v13 defaults to SWR and browser subscriptions only exist while connected | Sync Tag Invalidate Function or signed webhook; monitor failures; test no-browser publish |
| Two caches hide freshness bugs | Sanity CDN and Next/Netlify caches invalidate independently | Let `defineLive` select CDN mode, or set `useCdn:false` for webhook regeneration; log HIT/MISS and event delivery |
| Runtime cache assumptions fail on serverless | Netlify's current `use cache` value store is per-process memory | Put normal content in prerendered route output; do not depend on runtime LRU durability |
| Stega corrupts non-display values | Invisible Unicode changes equality, URLs, metadata, and JSON-LD | `stega:false`/`stegaClean`; development-only suspicious-stega audit |
| Image transformation explosion | Every unique URL/size/crop creates another cached variant | Central image component and finite width/crop policy |
| Confidential media leaks | Sanity dataset asset URLs are public | Never upload sensitive assets; use a different protected media system if required |
| Deploy breaks active sessions | Draft bypass and cache/build IDs change each deploy; adapter may auto-update | Re-enter preview after deploy; deploy smoke tests; optional Netlify skew protection for long-lived public sessions |
| CMS outage breaks rebuild/miss | build, preview, expired cache, and some crawler renders call Sanity | Retain last good deploy, error boundaries/fallbacks, monitor build and runtime fetch failures |

Before implementation is accepted, verify on an actual Netlify deploy—not only `next dev`:

1. Published page produces a static/PPR shell and never includes draft text or stega.
2. Presentation Tool can enable preview in Chrome and Safari, switch a Content Release perspective, click an overlay, and exit preview.
3. Metadata, sitemap, JSON-LD, href/src/class values, and route params contain no stega.
4. Publishing while **no public browser is connected** invalidates the correct page and shared-content dependents.
5. SWR and immediate-expiration paths exhibit the chosen semantics, including the first request after invalidation.
6. Revalidation rejects invalid signatures/secrets and malformed or excessive tag payloads.
7. A Deploy Preview works only from the intended scoped CORS/Presentation origins.
8. Responsive images use the intended direct-Sanity or Netlify path, preserve hotspot/crop, emit correct `sizes`, and do not create an accidental double-optimization chain.
9. A Sanity API failure during preview and during regeneration yields a contained error/fallback rather than resetting the 3D/audio client experience.
10. Production logs/metrics can distinguish live-event receipt, invalidation-handler success, cache revalidation, and upstream Sanity failure.

## Conclusion

There is no Netlify platform blocker for the desired Sanity integration. The decisive constraints are application-level: respect Next.js 16 Cache Components boundaries, treat preview state as request-only authenticated state, use Sanity v13 sync tags plus a server-triggered invalidation path for production freshness, and choose one image transformation/CDN owner per request. The recommended design preserves fast static/PPR published pages, uncached and visually editable drafts/releases, and a narrow editorial boundary that cannot take ownership of VANTA's interaction logic or mandatory disclosures.
