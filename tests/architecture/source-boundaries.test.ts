import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  inspectPublicRuntimeConfiguration,
  inspectSourceBoundaries,
} from "@/tooling/architecture/source-boundaries";

const temporaryRoots: string[] = [];

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "vanta-boundaries-"));
  temporaryRoots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    const destination = join(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, contents, "utf8");
  }
  return root;
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => rmSync(root, { recursive: true }));
});

describe("server/client source ownership", () => {
  it("accepts the repository's production source graph", () => {
    expect(inspectSourceBoundaries(process.cwd())).toEqual([]);
  });

  it("rejects server/client poisoning and missing environment markers", () => {
    const root = project({
      "app/widget.client.tsx": `
        "use client";
        import "client-only";
        import { secret } from "@/src/secrets/data.server";
        export const Widget = () => <p>{secret}</p>;
      `,
      "src/secrets/data.server.ts": `
        import "server-only";
        export const secret = process.env.PRIVATE_KEY;
      `,
      "src/browser/unmarked.client.ts": `
        export const viewport = window.innerWidth;
      `,
      "src/secrets/unmarked.server.ts": `
        export const key = process.env.PRIVATE_KEY;
      `,
    });

    const issues = inspectSourceBoundaries(root);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "server_imported_by_client" }),
        expect.objectContaining({ code: "missing_client_only_marker" }),
        expect.objectContaining({ code: "missing_server_only_marker" }),
      ]),
    );
  });

  it("rejects heavy runtime leakage and calls from Server Components to local handlers", () => {
    const root = project({
      "app/layout.tsx": `
        import { cookies } from "next/headers";
        import { Shell } from "@/src/shell";
        export default async function Layout({ children }) {
          await cookies();
          return <Shell>{children}</Shell>;
        }
      `,
      "app/monolith/page.tsx": `
        import { ProductView } from "@/src/product-view";
        export default async function Page() {
          const response = await fetch("/api/catalog");
          return <ProductView status={response.status} />;
        }
      `,
      "src/shell.tsx": `
        import { engine } from "@/src/audio/engine";
        export const Shell = ({ children }) => <body>{engine}{children}</body>;
      `,
      "src/audio/engine.ts": `export const engine = "audio";`,
      "src/product-view.tsx": `
        import "three";
        export const ProductView = ({ status }) => <main>{status}</main>;
      `,
    });

    const issues = inspectSourceBoundaries(root);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "heavy_runtime_import" }),
        expect.objectContaining({ code: "request_api_in_root_layout" }),
        expect.objectContaining({ code: "server_component_calls_route_handler" }),
      ]),
    );
  });
});

describe("public runtime configuration", () => {
  it("contains no commerce-platform mode, SDK, URL, identifier, or token", () => {
    expect(inspectPublicRuntimeConfiguration(process.cwd())).toEqual([]);
  });

  it("allows the approved public Preview disclosure without allowing an integration", () => {
    const root = project({
      "package.json": JSON.stringify({ dependencies: {} }),
      "src/preview-copy.ts": `
        export const boundary =
          "Nothing is entered, submitted, stored, or sent to Shopify.";
      `,
    });

    expect(inspectPublicRuntimeConfiguration(root)).toEqual([]);
  });

  it("rejects forbidden public commerce-platform configuration", () => {
    const root = project({
      "package.json": JSON.stringify({
        dependencies: { "@shopify/storefront-api-client": "1.0.0" },
      }),
      "next.config.ts": `export default { env: { NEXT_PUBLIC_SHOPIFY_TOKEN: "secret" } };`,
      "src/catalog.ts": `export const checkoutUrl = "https://example.invalid/checkout";`,
    });

    expect(inspectPublicRuntimeConfiguration(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "forbidden_public_dependency" }),
        expect.objectContaining({ code: "forbidden_public_configuration" }),
        expect.objectContaining({ code: "forbidden_public_source" }),
      ]),
    );
  });
});
