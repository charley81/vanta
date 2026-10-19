import { describe, expect, it } from "vitest";

import {
  DELIVERY_BUDGETS,
  evaluateDeliveryBudgets,
  type DeliveryInventory,
} from "@/tooling/verification/delivery-budgets";

function passingInventory(): DeliveryInventory {
  return {
    routes: {
      home: {
        initialJavaScript: [
          { bytes: DELIVERY_BUDGETS.homeInitialJavaScriptBytes, path: "home.js" },
        ],
      },
      product: {
        initialJavaScript: [
          {
            bytes: DELIVERY_BUDGETS.productInitialJavaScriptBytes,
            path: "product.js",
          },
        ],
      },
      synth: {
        initialJavaScript: [
          { bytes: DELIVERY_BUDGETS.synthInitialJavaScriptBytes, path: "synth.js" },
        ],
      },
    },
    deferredRendererJavaScript: [
      {
        bytes: DELIVERY_BUDGETS.deferredRendererJavaScriptBytes,
        path: "renderer.js",
      },
    ],
    firstRenderFonts: [
      { bytes: DELIVERY_BUDGETS.firstRenderFontBytes, path: "font.woff2" },
    ],
    runtimeModel: {
      bytes: DELIVERY_BUDGETS.runtimeModelBytes,
      path: "model.glb",
    },
    motionVariants: [
      {
        bytes: DELIVERY_BUDGETS.singleMotionVariantBytes,
        path: "motion.webm",
      },
    ],
  };
}

describe("delivery budget verification", () => {
  it("accepts every delivery boundary at its approved ceiling", () => {
    const result = evaluateDeliveryBudgets(passingInventory());

    expect(result.status).toBe("pass");
    expect(result.issues).toEqual([]);
    expect(result.summary.routes.product.initialJavaScriptBytes).toBe(
      DELIVERY_BUDGETS.productInitialJavaScriptBytes,
    );
  });

  it("fails an oversized route, deferred renderer, font, model, and motion asset", () => {
    const inventory = passingInventory();
    inventory.routes.product.initialJavaScript[0].bytes += 1;
    inventory.deferredRendererJavaScript[0].bytes += 1;
    inventory.firstRenderFonts[0].bytes += 1;
    inventory.runtimeModel.bytes += 1;
    inventory.motionVariants[0].bytes += 1;

    const result = evaluateDeliveryBudgets(inventory);

    expect(result.status).toBe("fail");
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "initial_javascript_budget_exceeded",
      "deferred_renderer_budget_exceeded",
      "font_budget_exceeded",
      "runtime_model_budget_exceeded",
      "motion_variant_budget_exceeded",
    ]);
  });

  it("fails when Product, the shell, or Bag initial JavaScript contains Realtime or audio code", () => {
    const inventory = passingInventory();
    inventory.routes.product.initialJavaScript.push({
      bytes: 1,
      path: "shared.js",
      runtimeKinds: ["realtime"],
    });
    inventory.shellInitialJavaScript = [
      { bytes: 1, path: "shell.js", runtimeKinds: ["audio"] },
    ];
    inventory.bagInitialJavaScript = [
      { bytes: 1, path: "bag.js", runtimeKinds: ["realtime", "audio"] },
    ];

    const result = evaluateDeliveryBudgets(inventory);

    expect(result.status).toBe("fail");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "eager_heavy_runtime",
          path: "routes.product.initialJavaScript[1]",
        }),
        expect.objectContaining({
          code: "eager_heavy_runtime",
          path: "shellInitialJavaScript[0]",
        }),
        expect.objectContaining({
          code: "eager_heavy_runtime",
          path: "bagInitialJavaScript[0]",
        }),
      ]),
    );
  });

  it("counts a shared file once within each boundary", () => {
    const inventory = passingInventory();
    const shared = { bytes: 1_024, path: "shared.js" };
    inventory.routes.home.initialJavaScript = [shared, { ...shared }];
    inventory.firstRenderFonts = [
      { bytes: 2_048, path: "shared.woff2" },
      { bytes: 2_048, path: "shared.woff2" },
    ];

    const result = evaluateDeliveryBudgets(inventory);

    expect(result.summary.routes.home.initialJavaScriptBytes).toBe(1_024);
    expect(result.summary.firstRenderFontBytes).toBe(2_048);
  });
});
