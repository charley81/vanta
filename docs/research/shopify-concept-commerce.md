# Headless Shopify for concept-only commerce

**Issue:** [#5 — Research headless Shopify for concept-only commerce](https://github.com/charley81/vanta/issues/5)  
**Researched:** 2026-10-14  
**API baseline:** Storefront API `2026-10` (the latest stable version on the research date)

## Answer

A Shopify-backed concept store is viable, but the no-purchase guarantee cannot come from the VANTA UI or API gateway alone.

The strongest current Shopify-documented design is:

1. use a normal merchant store with Shopify's **Headless** sales channel and the stable GraphQL Storefront API for catalog and Cart API behavior;
2. put the production store on **Pause and Build** before making VANTA public; and
3. keep checkout absent from VANTA's API contract and UI as defense in depth.

Shopify states that Pause and Build deactivates checkout **across all sales channels**, prevents draft orders from being completed, and lets customers view products but not purchase them ([Pausing your store](https://help.shopify.com/en/manual/your-account/manage-orgs-and-stores/manage-pricing-plan/pause-store)). That store-level state—not hiding a button—is the supported control that prevents a functional checkout and payment while it remains in force.

There is an important qualification: Shopify does not explicitly document the combination “Headless Storefront Cart API on a Pause and Build store.” The pause documentation says all apps remain active, while the Headless documentation describes an installable sales-channel app, so continued API access is a reasonable inference, not a published compatibility guarantee ([Pause and Build](https://help.shopify.com/en/manual/your-account/manage-orgs-and-stores/manage-pricing-plan/pause-store#work-on-your-store-while-youre-on-the-pause-and-build-plan), [Headless setup](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started)). Before this architecture is approved, VANTA must verify the exact behavior on a paused store and obtain written Shopify Support confirmation that the Headless channel and Cart API are supported there for this long-lived public use.

If that gate fails, current primary documentation does **not** establish a Shopify-only architecture that simultaneously provides Shopify Cart API behavior and guarantees no checkout. The fallback is a Shopify read-side catalog plus a VANTA-owned non-commerce “bag”; that would conflict with the current preference that Shopify own the bag and would require a later product decision.

## Recommended architecture

### Store and catalog

- Create a paid, non-Plus merchant store, install Shopify's free **Headless** sales channel, and create a storefront. Shopify documents that the channel generates public and private Storefront API tokens and lets the merchant manage storefront permissions ([Getting started with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started)).
- Keep MONOLITH `ACTIVE` and publish it to the Headless publication only. Shopify requires an active product status for a product to be visible in a channel ([`publishablePublish`](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/publishablePublish)). Do not publish it to Online Store, Shop, Buy Button, marketplace, POS, or other sales channels.
- Use Shopify Admin only as the management plane for product, variant, price, inventory, and publication. Do not expose Admin API credentials or Admin mutations to the public application.
- Pin Storefront API `2026-10` rather than `latest`. Shopify releases quarterly, supports each stable version for at least 12 months, and recommends specifying and updating stable versions ([API versioning](https://shopify.dev/docs/api/usage/versioning)).

### Runtime API boundary

The browser should call narrow VANTA server endpoints/server actions. The server should call Storefront GraphQL with a **private** token, least-privilege scopes, and `Shopify-Storefront-Buyer-IP` for buyer-originated traffic. Shopify says private tokens must stay server-side and recommends requesting only necessary scopes ([Storefront API authentication](https://shopify.dev/docs/api/storefront/2026-10#authentication)). Do not expose an arbitrary GraphQL proxy.

Allow only fixed operations for:

- product and variant reads;
- `cartCreate` and cart lookup;
- `cartLinesAdd`, `cartLinesUpdate`, and `cartLinesRemove`; and
- the fields required to render the bag.

Explicitly exclude `checkoutUrl`, buyer identity, delivery addresses/options, discount codes, gift cards, customer accounts, and all checkout/payment surfaces. This exclusion is defense in depth and a clear application contract; it is **not** the no-purchase guarantee.

The Storefront schema supplies authentic commerce-shaped values:

- `Product`/`ProductVariant` supply product and variant identity;
- `ProductVariant.price` is the variant price;
- `availableForSale` is Shopify's sale-availability boolean; and
- `quantityAvailable` is the total sellable quantity for online sales channels and requires `unauthenticated_read_product_inventory` ([`ProductVariant`](https://shopify.dev/docs/api/storefront/2026-10/objects/ProductVariant), [Storefront access scopes](https://shopify.dev/docs/api/usage/access-scopes#unauthenticated-access-scopes)).

Use `MoneyV2.amount` with its `currencyCode`; do not hard-code currency formatting. Treat `Cart.cost` only as an estimate: Shopify documents that cart costs can change at checkout ([Cart management](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage#cart-object-relationships)). Because VANTA has no checkout, the product page should present the variant price as concept catalog data rather than promise a payable total.

### Persistent bag

Use Shopify's Cart API so Shopify remains the bag's system of record. Persist the **full cart ID only in an encrypted or opaque, `HttpOnly`, `Secure`, `SameSite` server session/cookie**. Shopify says a cart ID contains a secret key, mutations fail without it, and the secret must never appear in client-side code, public pages, or shareable links ([Cart ID guidance](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage#cart-id)). Consequently, `localStorage` is not an acceptable place for the cart ID.

On each bag operation, fetch the current Shopify cart and render its returned merchandise, quantities, and costs rather than trusting a client snapshot. Handle both `userErrors` and cart warnings; Shopify can automatically reduce an out-of-stock line to zero and return `MERCHANDISE_OUT_OF_STOCK` ([Cart warnings](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/cart-warnings)).

“Persistent” has a platform limit: unused and abandoned Shopify carts automatically expire within 30 days of creation ([Cart limits](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart#speed-and-scale)). The later commerce decision must define whether an expired bag becomes empty or is rebuilt from a separate server-side snapshot. Cross-device persistence is not supplied by an anonymous cookie and would require an identity/account design that is currently out of scope.

### No-purchase invariant

Before launch:

1. switch the production store to Pause and Build;
2. wait until the plan change is effective;
3. verify the store remains paused; and
4. keep the VANTA UI and API checkout-free.

The timing matters: Shopify says a Pause and Build change can be scheduled for the end of the current billing cycle and that the store continues accepting orders until the effective date ([Pause and Build troubleshooting](https://help.shopify.com/en/manual/your-account/manage-orgs-and-stores/manage-pricing-plan/pause-store#future-plan-change-date)). A scheduled pause is not safe enough for launch.

Treat the paused plan as a production invariant. Restrict owner access, require two-step authentication, document that selecting a new paid plan re-enables selling, and alert/retest after any plan, app, publication, payment, or product-channel change. An authorized owner can unpause the store, so “never” is conditional on keeping that administrative invariant intact.

## Why application-only blocking is insufficient

The Cart API deliberately connects carts to checkout. The `Cart.checkoutUrl` field is non-null, and Shopify documents it as the URL used to direct a buyer to Shopify web checkout ([`Cart`](https://shopify.dev/docs/api/storefront/2026-10/objects/Cart#field-Cart.fields.checkoutUrl)). A caller can request that field even if VANTA's own query omits it.

More importantly, the current Storefront API supports **tokenless** product/collection access and tokenless Cart read/write ([Storefront API authentication](https://shopify.dev/docs/api/storefront/2026-10#tokenless-access)). Therefore these measures do not independently guarantee safety:

- hiding or not rendering a checkout button;
- omitting `checkoutUrl` from VANTA's response;
- keeping a public token out of the browser;
- using a private-token backend-for-frontend;
- leaving payment providers unconfigured; or
- publishing only to the Headless channel.

They reduce accidental exposure, but an external caller can attempt the public Shopify surface directly. Pause and Build is the documented platform enforcement layer.

## Suitable store mode and rejected alternatives

### Use: paid store switched to Pause and Build

Shopify's current constraints are:

- only the store owner can select it;
- the store must be past its free trial and already on a paid plan;
- Shopify Plus stores and organizations are ineligible;
- checkout is deactivated across all sales channels;
- Online Store checkout, POS, discounts, abandoned-checkout recovery, gift cards, and some third-party publication integrations are deactivated; and
- apps remain active unless canceled individually ([Pause and Build considerations](https://help.shopify.com/en/manual/your-account/manage-orgs-and-stores/manage-pricing-plan/pause-store#considerations-for-pausing)).

Shopify describes this as a temporary pause for stores such as seasonal stores, not as a permanent “concept catalog” plan. It also does not state how `availableForSale`, tokenless Cart mutations, or `checkoutUrl` behave while paused. Those are decision-blocking uncertainties, not guarantees.

### Do not use: dev/client-transfer store as production

Shopify says dev stores are for development and testing only, cannot be used in production, cannot process real transactions, and can still test orders through payment test modes ([Dev store limitations](https://shopify.dev/docs/apps/build/dev-dashboard/stores/development-stores#limitations)). Client-transfer stores likewise support test checkout and unlimited test orders even though real transactions are blocked ([Testing orders in client transfer stores](https://help.shopify.com/en/partners/manage-clients-stores/test-orders)). These modes fail the “never reach checkout” requirement and are not a supported public-production basis.

### Do not use: payment test mode

Shopify Payments test mode prevents real capture but exists specifically to exercise payment and order flows. Shopify warns that customers can still complete checkout through some express options, even though real charges should not be captured ([Testing Shopify Payments](https://help.shopify.com/en/manual/payments/shopify-payments/testing-shopify-payments#test-mode)). It therefore fails the no-checkout requirement and is a mutable payment setting, not a commerce kill switch.

### Do not use: zero inventory as the primary lock

Zero inventory can make a variant unavailable and trigger cart warnings, but then Shopify cannot provide credible available-to-bag behavior. Inventory also changes independently. It is useful defense in depth, not the architectural guarantee.

## Guarantees, inferences, and unknowns

| Classification | Finding |
| --- | --- |
| **Shopify-documented guarantee** | While Pause and Build is effective, checkout is deactivated across all sales channels and customers can view products but cannot purchase them ([source](https://help.shopify.com/en/manual/your-account/manage-orgs-and-stores/manage-pricing-plan/pause-store)). |
| **Shopify-documented guarantee** | Storefront API `2026-10` exposes product, variant, price, sale availability, inventory (with scope), and Cart API fields/mutations ([`ProductVariant`](https://shopify.dev/docs/api/storefront/2026-10/objects/ProductVariant), [`Cart`](https://shopify.dev/docs/api/storefront/2026-10/objects/Cart)). |
| **Shopify-documented constraint** | Storefront supports tokenless product and Cart read/write; `checkoutUrl` is in the public schema ([authentication](https://shopify.dev/docs/api/storefront/2026-10#authentication), [`checkoutUrl`](https://shopify.dev/docs/api/storefront/2026-10/objects/Cart#field-Cart.fields.checkoutUrl)). |
| **Shopify-documented constraint** | Cart IDs contain a client secret and abandoned carts expire within 30 days ([Cart ID](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage#cart-id), [cart limits](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart#speed-and-scale)). |
| **Reasonable inference, not explicit support** | Because paused stores keep apps active and Headless is a Shopify sales-channel app, Storefront catalog and cart operations should remain available after pausing. Shopify does not explicitly promise this combination. |
| **Unknown until tested** | Whether `cartCreate`, all line mutations, tokenless requests, `availableForSale`, and `quantityAvailable` behave as VANTA needs on the effective Pause and Build plan. |
| **Unknown from public docs** | What HTTP/UI response a paused store's generated `checkoutUrl` returns. The documented guarantee is that checkout is deactivated, not that no URL can be generated or opened. |
| **Operational assumption** | The owner will not reactivate a paid selling plan, republish MONOLITH to another channel, or change commerce settings without review. |
| **Policy uncertainty** | Shopify publishes no explicit approval for a fictional but realistic concept product on a long-lived paused store. |

## Policy and product-representation risk

Shopify's Pause and Build page cautions merchants to review the Terms of Service. The Terms make the merchant responsible for its store, goods, customer relationship, required disclosures, and compliance with consumer-protection law; Shopify can also modify services and remove materials ([Shopify Terms of Service, sections 3–4](https://www.shopify.com/legal/terms)). No current first-party policy found in this research expressly approves or prohibits this exact concept-product use.

Accordingly:

- do not describe Shopify's acceptance of VANTA as guaranteed;
- obtain written Shopify Support confirmation of the intended long-term Pause and Build + Headless use;
- have the final presentation reviewed for applicable advertising/consumer-protection requirements;
- disclose “concept product—not available for purchase” at every terminal purchase path, in the bag, and anywhere availability or pricing could reasonably imply an offer; and
- avoid fake scarcity, fabricated reviews, sale claims, delivery promises, tax/shipping estimates, or language suggesting an order can be placed.

Those disclosure recommendations are risk controls and VANTA product requirements, not claims derived from Shopify API behavior.

## Approval gates for the later commerce decision

Do not approve this architecture until a representative store has been moved to an **effective** Pause and Build state and all of the following pass:

1. Headless product/variant queries return the intended product, variant, `MoneyV2`, `availableForSale`, and inventory fields.
2. `cartCreate`, lookup, add, update, remove, warning, expiry/recovery, and concurrency behavior work through the VANTA server boundary.
3. The full cart ID and private token never appear in browser storage, client bundles, URLs, analytics, error reports, or logs.
4. Direct tokenless Storefront requests and any discoverable Online Store/Ajax/cart URLs cannot reach a functional checkout or payment flow.
5. A generated `checkoutUrl`, tested only in the controlled environment, cannot begin or complete checkout on the paused store.
6. MONOLITH is published only to the intended Headless publication, and every other channel is disabled or unpublished.
7. An automated production smoke check continuously verifies the concept disclosure and that no checkout/payment path is functional.
8. Shopify Support confirms in writing that this public, long-lived use of Headless catalog + Cart API on Pause and Build is supported.

Until gates 1, 2, 5, and 8 pass, the architecture is a well-supported proposal assembled from documented components—not a fully supported end-to-end guarantee.
