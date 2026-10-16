import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:https";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const publicPort = Number(process.env.PORT ?? "32143");
const nextPort = Number(process.env.NEXT_INTERNAL_PORT ?? "32144");

function validPort(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= 65_535;
}

if (!validPort(publicPort) || !validPort(nextPort) || publicPort === nextPort) {
  throw new Error("PORT and NEXT_INTERNAL_PORT must be distinct valid ports");
}

const certificateDirectory = mkdtempSync(join(tmpdir(), "vanta-commerce-"));
const certificateConfiguration = join(certificateDirectory, "openssl.cnf");
const certificatePath = join(certificateDirectory, "localhost.pem");
const keyPath = join(certificateDirectory, "localhost-key.pem");

writeFileSync(
  certificateConfiguration,
  [
    "[req]",
    "distinguished_name = subject",
    "x509_extensions = extensions",
    "prompt = no",
    "[subject]",
    "CN = localhost",
    "[extensions]",
    "subjectAltName = @alternate_names",
    "[alternate_names]",
    "DNS.1 = localhost",
    "IP.1 = 127.0.0.1",
    "",
  ].join("\n"),
);

const certificate = spawnSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-days",
    "1",
    "-keyout",
    keyPath,
    "-out",
    certificatePath,
    "-config",
    certificateConfiguration,
  ],
  { stdio: "ignore" },
);
if (certificate.status !== 0) {
  rmSync(certificateDirectory, { force: true, recursive: true });
  throw new Error("Unable to generate the temporary HTTPS certificate");
}

let nextServer: ChildProcess | null = spawn(
  "pnpm",
  [
    "next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(nextPort),
  ],
  { env: process.env, stdio: "inherit" },
);
let stopping = false;

const proxy = createServer(
  {
    cert: readFileSync(certificatePath),
    key: readFileSync(keyPath),
  },
  (incoming, outgoing) => {
    const publicOrigin = `https://${incoming.headers.host ?? `127.0.0.1:${publicPort}`}`;
    const headers = {
      ...incoming.headers,
      host: `127.0.0.1:${nextPort}`,
      ...(incoming.headers.origin === publicOrigin
        ? { origin: `https://localhost:${nextPort}` }
        : {}),
      "x-forwarded-host": incoming.headers.host ?? `127.0.0.1:${publicPort}`,
      "x-forwarded-port": String(publicPort),
      "x-forwarded-proto": "https",
    };
    const forwarded = httpRequest(
      {
        headers,
        hostname: "127.0.0.1",
        method: incoming.method,
        path: incoming.url,
        port: nextPort,
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    forwarded.on("error", () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.pipe(forwarded);
  },
);

function cleanUp(): void {
  rmSync(certificateDirectory, { force: true, recursive: true });
}

function stop(signal: NodeJS.Signals): void {
  if (stopping) return;
  stopping = true;
  nextServer?.kill(signal);
  proxy.close(() => {
    cleanUp();
    process.exit(0);
  });
  setTimeout(() => {
    cleanUp();
    process.exit(0);
  }, 5_000).unref();
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));

nextServer.once("exit", (code, signal) => {
  nextServer = null;
  if (stopping) return;
  stopping = true;
  proxy.close();
  cleanUp();
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

proxy.listen(publicPort, "127.0.0.1");
