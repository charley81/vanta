import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

export type ArchitectureIssue = {
  code:
    | "missing_server_only_marker"
    | "missing_client_only_marker"
    | "server_imported_by_client"
    | "server_primitive_in_client"
    | "heavy_runtime_import"
    | "request_api_in_root_layout"
    | "server_component_calls_route_handler"
    | "forbidden_public_dependency"
    | "forbidden_public_configuration"
    | "forbidden_public_source";
  path: string;
  message: string;
};

type SourceModule = {
  absolutePath: string;
  path: string;
  text: string;
  imports: string[];
  clientEntry: boolean;
  clientOnly: boolean;
  serverOnly: boolean;
};

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx", ".mts"]);
const NODE_IMPORTS = new Set([
  "assert",
  "buffer",
  "child_process",
  "crypto",
  "fs",
  "http",
  "https",
  "module",
  "net",
  "os",
  "path",
  "process",
  "stream",
  "tls",
  "url",
  "util",
  "worker_threads",
]);
const HEAVY_PACKAGES = [
  "three",
  "@react-three/fiber",
  "@react-three/drei",
  "tone",
];
const HEAVY_PATH = /(^|[/._-])(3d|audio|decoder|gltf|renderer|rendering)([/._-]|$)|\.glb$/i;
const PUBLIC_PLATFORM_REFERENCE =
  /shopify|myshopify\.com|shopify-cart|storefront[\s_-]*(api|endpoint|token|client)/i;
const PUBLIC_COMMERCE_IDENTIFIER =
  /\b(shopifyMode|commerceMode|storefrontToken|productId|variantId|cartId|checkoutUrl)\b/i;
const PUBLIC_SECRET_REFERENCE =
  /NEXT_PUBLIC_[A-Z0-9_]*(TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY)/;

function containsForbiddenPublicReference(text: string): boolean {
  return (
    PUBLIC_PLATFORM_REFERENCE.test(text) ||
    PUBLIC_COMMERCE_IDENTIFIER.test(text) ||
    PUBLIC_SECRET_REFERENCE.test(text)
  );
}

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

function normalizedPath(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function importSpecifiers(text: string, path: string): string[] {
  const kind = path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const imports: string[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}

function hasDirective(text: string, directive: string): boolean {
  const source = ts.createSourceFile(
    "module.tsx",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  return source.statements.some(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression) &&
      statement.expression.text === directive,
  );
}

function readModules(root: string): Map<string, SourceModule> {
  const files = [join(root, "app"), join(root, "src")].flatMap(sourceFiles);
  return new Map(
    files.map((absolutePath) => {
      const text = readFileSync(absolutePath, "utf8");
      const imports = importSpecifiers(text, absolutePath);
      const path = normalizedPath(root, absolutePath);
      const sourceModule = {
        absolutePath,
        path,
        text,
        imports,
        clientEntry:
          hasDirective(text, "use client") || /\.client\.[^.]+$/.test(path),
        clientOnly: imports.includes("client-only"),
        serverOnly:
          imports.includes("server-only") || /\.server\.[^.]+$/.test(path),
      } satisfies SourceModule;
      return [resolve(absolutePath), sourceModule] as const;
    }),
  );
}

function resolveSourceImport(
  root: string,
  importer: SourceModule,
  specifier: string,
  modules: Map<string, SourceModule>,
): SourceModule | undefined {
  let base: string;
  if (specifier.startsWith("@/")) base = join(root, specifier.slice(2));
  else if (specifier.startsWith(".")) {
    base = resolve(dirname(importer.absolutePath), specifier);
  } else return undefined;

  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"].map(
      (extension) => `${base}${extension}`,
    ),
    ...[".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"].map((extension) =>
      join(base, `index${extension}`),
    ),
  ];
  return candidates
    .map((path) => resolve(path))
    .map((path) => modules.get(path))
    .find(Boolean);
}

function isHeavyImport(specifier: string): boolean {
  return (
    HEAVY_PACKAGES.some(
      (name) => specifier === name || specifier.startsWith(`${name}/`),
    ) || HEAVY_PATH.test(specifier)
  );
}

function isNodeImport(specifier: string): boolean {
  const normalized = specifier.replace(/^node:/, "").split("/")[0];
  return specifier.startsWith("node:") || NODE_IMPORTS.has(normalized);
}

function addIssue(
  issues: ArchitectureIssue[],
  issue: ArchitectureIssue,
): void {
  if (
    !issues.some(
      (candidate) =>
        candidate.code === issue.code &&
        candidate.path === issue.path &&
        candidate.message === issue.message,
    )
  ) {
    issues.push(issue);
  }
}

export function inspectSourceBoundaries(root: string): ArchitectureIssue[] {
  const modules = readModules(root);
  const issues: ArchitectureIssue[] = [];

  for (const sourceModule of modules.values()) {
    if (
      /\.server\.[^.]+$/.test(sourceModule.path) &&
      !sourceModule.imports.includes("server-only")
    ) {
      addIssue(issues, {
        code: "missing_server_only_marker",
        path: sourceModule.path,
        message: "Server-only modules must import server-only.",
      });
    }
    if (/\.client\.[^.]+$/.test(sourceModule.path) && !sourceModule.clientOnly) {
      addIssue(issues, {
        code: "missing_client_only_marker",
        path: sourceModule.path,
        message: "Client-only modules must import client-only.",
      });
    }

    if (
      sourceModule.path === "app/layout.tsx" &&
      sourceModule.imports.includes("next/headers")
    ) {
      addIssue(issues, {
        code: "request_api_in_root_layout",
        path: sourceModule.path,
        message:
          "The root layout must not import request APIs; request-time Bag work begins below the cacheable shell.",
      });
    }

    const isServerRouteFile =
      sourceModule.path.startsWith("app/") &&
      /\/(page|layout)\.[jt]sx?$/.test(sourceModule.path) &&
      !sourceModule.clientEntry;
    if (
      isServerRouteFile &&
      /\bfetch\s*\(\s*["'`]\/api\//.test(sourceModule.text)
    ) {
      addIssue(issues, {
        code: "server_component_calls_route_handler",
        path: sourceModule.path,
        message:
          "Server Components must compose through server modules instead of calling local Route Handlers.",
      });
    }
  }

  const protectedRouteEntries = [...modules.values()].filter(
    (sourceModule) =>
      sourceModule.path === "app/layout.tsx" ||
      sourceModule.path.startsWith("app/monolith/"),
  );
  for (const entry of protectedRouteEntries) {
    const visited = new Set<string>();
    const visit = (sourceModule: SourceModule): void => {
      if (visited.has(sourceModule.absolutePath)) return;
      visited.add(sourceModule.absolutePath);

      for (const specifier of sourceModule.imports) {
        if (isHeavyImport(specifier)) {
          addIssue(issues, {
            code: "heavy_runtime_import",
            path: entry.path,
            message: `${entry.path} reaches forbidden heavy runtime ${specifier} through ${sourceModule.path}.`,
          });
        }
        const dependency = resolveSourceImport(
          root,
          sourceModule,
          specifier,
          modules,
        );
        if (dependency) visit(dependency);
      }
    };
    visit(entry);
  }

  for (const entry of [...modules.values()].filter(
    (sourceModule) => sourceModule.clientEntry,
  )) {
    const visited = new Set<string>();
    const visit = (sourceModule: SourceModule): void => {
      if (visited.has(sourceModule.absolutePath)) return;
      visited.add(sourceModule.absolutePath);

      if (sourceModule.serverOnly) {
        addIssue(issues, {
          code: "server_imported_by_client",
          path: entry.path,
          message: `${entry.path} reaches server-only module ${sourceModule.path}.`,
        });
        return;
      }
      if (/\bprocess\.env\b/.test(sourceModule.text)) {
        addIssue(issues, {
          code: "server_primitive_in_client",
          path: sourceModule.path,
          message: `${sourceModule.path} reads process.env from the client module graph.`,
        });
      }

      for (const specifier of sourceModule.imports) {
        if (isNodeImport(specifier)) {
          addIssue(issues, {
            code: "server_primitive_in_client",
            path: sourceModule.path,
            message: `${sourceModule.path} imports server primitive ${specifier}.`,
          });
        }
        const dependency = resolveSourceImport(
          root,
          sourceModule,
          specifier,
          modules,
        );
        if (dependency) visit(dependency);
      }
    };
    visit(entry);
  }

  return issues.sort((left, right) =>
    `${left.path}:${left.code}`.localeCompare(`${right.path}:${right.code}`),
  );
}

function publicSourceFiles(root: string): string[] {
  return [join(root, "app"), join(root, "src")].flatMap(sourceFiles);
}

export function inspectPublicRuntimeConfiguration(
  root: string,
): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];
  const packagePath = join(root, "package.json");
  if (existsSync(packagePath)) {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      dependencies?: Record<string, string>;
    };
    Object.keys(packageJson.dependencies ?? {})
      .filter((name) => /shopify|storefront/i.test(name))
      .forEach((name) => {
        addIssue(issues, {
          code: "forbidden_public_dependency",
          path: "package.json",
          message: `Public production dependency ${name} is forbidden.`,
        });
      });
  }

  for (const configName of ["next.config.js", "next.config.mjs", "next.config.ts"]) {
    const path = join(root, configName);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    if (containsForbiddenPublicReference(text)) {
      addIssue(issues, {
        code: "forbidden_public_configuration",
        path: configName,
        message: `${configName} contains forbidden public commerce or secret configuration.`,
      });
    }
  }

  for (const path of publicSourceFiles(root)) {
    const text = readFileSync(path, "utf8");
    if (containsForbiddenPublicReference(text)) {
      const sourcePath = normalizedPath(root, path);
      addIssue(issues, {
        code: "forbidden_public_source",
        path: sourcePath,
        message: `${sourcePath} contains a forbidden public commerce or secret reference.`,
      });
    }
  }

  return issues.sort((left, right) =>
    `${left.path}:${left.code}`.localeCompare(`${right.path}:${right.code}`),
  );
}
