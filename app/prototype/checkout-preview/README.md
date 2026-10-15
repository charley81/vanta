# VANTA Bag and Checkout Preview prototype

> Throwaway prototype for **Prototype the public Bag and Checkout Preview**. Do not promote this code directly to production.

Three structurally different Checkout Preview models, switchable with `?variant=` on one route:

- **A / Signal Ledger** — focused step-by-step handoff with a persistent order ledger.
- **B / Open Manifest** — one transparent document with every synthetic section visible.
- **C / Dispatch Console** — milestone navigation around a persistent synthetic shipment brief.

All three preserve the already-decided Bag drawer/full-screen-sheet behavior, quantity-one MONOLITH, synthetic-only data, no inputs, no payment stage, no Shopify call, and the explicit terminal unavailable state.

## Run

```bash
pnpm prototype:checkout-preview
```

Open <http://localhost:3000/prototype/checkout-preview?variant=A&step=bag>.

- Bottom arrows or keyboard `←` / `→`: change model.
- Use the flow actions to move from Bag through Contact, Delivery, Review, and the terminal state.
- **Simulate interruption** exposes the proposed recovery behavior.
- Every model and step is reload-stable through `variant` and `step` query parameters.
- The fixed state readout makes the prototype boundary explicit: zero visitor fields, writes, and network calls.
