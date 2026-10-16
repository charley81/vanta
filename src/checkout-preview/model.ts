export function composeCheckoutPreviewRouteViewModel() {
  return {
    route: "/checkout-preview" as const,
    title: "Checkout Preview | VANTA" as const,
    seoDescription:
      "Review the VANTA Checkout Preview boundary for MONOLITH using predefined synthetic details without payment, ordering, or visitor data.",
    banner:
      "Preview — Synthetic details only. Nothing is entered, submitted, stored, or sent to Shopify.",
    unavailable: {
      heading: "Checkout Preview needs a confirmed Bag.",
      body: "MONOLITH must be present in this browser’s confirmed Bag before the non-transactional preview can begin.",
      productAction: {
        label: "Return to MONOLITH" as const,
        href: "/monolith" as const,
      },
    },
    stages: [
      {
        key: "contact" as const,
        index: "01" as const,
        label: "Contact" as const,
        description: "Inspect the predefined recipient profile.",
      },
      {
        key: "delivery" as const,
        index: "02" as const,
        label: "Delivery" as const,
        description: "Inspect the fictional destination and service.",
      },
      {
        key: "review" as const,
        index: "03" as const,
        label: "Review" as const,
        description: "Confirm what this preview will—and will not—do.",
      },
    ],
    contact: {
      label: "Preview recipient",
      status: "Predefined / fictional",
      values: [
        { label: "Name", value: "Mara Vale" },
        { label: "Email", value: "mara.vale@example.invalid" },
        { label: "Phone", value: "Not collected" },
      ],
      explanation:
        "This fixed profile demonstrates hierarchy without asking the visitor to identify themselves. There are no editable fields.",
    },
    delivery: {
      label: "Preview destination",
      status: "Predefined / fictional",
      destination:
        "VANTA Preview Studio, 101 Signal Way, Portland, OR 97205, United States",
      values: [
        { label: "Service", value: "Studio courier" },
        { label: "Window", value: "3–5 preview days" },
        { label: "Cost", value: "$0.00 preview" },
      ],
    },
    review: {
      label: "Preview review",
      status: "No transaction",
      statements: [
        "One MONOLITH at the canonical $2,499 USD price",
        "Predefined recipient and delivery information only",
        "No payment, discounts, gift cards, tax quotes, or buyer input",
        "No Shopify Checkout, orders, fulfillment, or notifications",
      ],
      explanation:
        "Complete the product demonstration. The next screen is an explicit offline state—not a payment step.",
    },
    terminal: {
      eyebrow: "Checkout Preview / complete",
      heading: "Ordering offline",
      statement:
        "Checkout Preview complete. No order was placed and no payment information was collected.",
      facts: [
        { label: "Payment", value: "Not requested" },
        { label: "Order", value: "Not created" },
        { label: "Visitor data", value: "Not collected" },
        { label: "Bag", value: "MONOLITH retained" },
      ],
    },
    ledger: {
      label: "Order ledger / synthetic",
      item: "MONOLITH",
      detail: "Graphite / Quantity 1",
      rows: [
        { label: "Subtotal", value: "$2,499.00" },
        { label: "Preview delivery", value: "$0.00" },
        { label: "Tax", value: "Not calculated" },
        { label: "Preview total", value: "$2,499 USD" },
      ],
      boundary:
        "No charge, authorization, order, reservation, or price commitment.",
    },
  };
}

export type CheckoutPreviewRouteViewModel = ReturnType<
  typeof composeCheckoutPreviewRouteViewModel
>;
