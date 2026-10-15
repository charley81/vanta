import "client-only";

export type BagPrice = {
  amountMinor: number;
  currency: string;
  display: string;
};

export type BagSnapshot = {
  schemaVersion: 1;
  item: null | {
    brand: string;
    name: string;
    category: string;
    finish: string;
    price: BagPrice;
  };
  subtotal: BagPrice | null;
  expiresAt: string | null;
};

export type BagClientErrorCode =
  | "bag_disabled"
  | "bag_read_only"
  | "invalid_origin"
  | "https_required"
  | "invalid_request"
  | "payload_too_large"
  | "rate_limited"
  | "timeout"
  | "invalid_response"
  | "network"
  | "unavailable";

export class BagClientError extends Error {
  readonly code: BagClientErrorCode;
  readonly status: number | null;

  constructor(
    code: BagClientErrorCode,
    message: string,
    status: number | null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BagClientError";
    this.code = code;
    this.status = status;
  }
}

type BagClientOptions = {
  request?: typeof fetch;
  timeoutMilliseconds?: number;
};

export type BagClient = {
  read(): Promise<BagSnapshot>;
  add(): Promise<BagSnapshot>;
  remove(): Promise<BagSnapshot>;
  getConfirmed(): BagSnapshot | null;
};

type BagOperation = "read" | "add" | "remove";

const PATHS: Record<BagOperation, string> = {
  read: "/api/bag",
  add: "/api/bag/add",
  remove: "/api/bag/remove",
};
const ERROR_CODES = new Set<BagClientErrorCode>([
  "bag_disabled",
  "bag_read_only",
  "invalid_origin",
  "https_required",
  "invalid_request",
  "payload_too_large",
  "rate_limited",
]);

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function parsePrice(value: unknown): BagPrice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    !exactKeys(candidate, ["amountMinor", "currency", "display"]) ||
    !Number.isSafeInteger(candidate.amountMinor) ||
    (candidate.amountMinor as number) < 0 ||
    typeof candidate.currency !== "string" ||
    !/^[A-Z]{3}$/u.test(candidate.currency) ||
    typeof candidate.display !== "string" ||
    candidate.display.length > 64
  ) {
    return null;
  }
  return {
    amountMinor: candidate.amountMinor as number,
    currency: candidate.currency,
    display: candidate.display,
  };
}

function parseSnapshot(value: unknown): BagSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    !exactKeys(candidate, ["schemaVersion", "item", "subtotal", "expiresAt"]) ||
    candidate.schemaVersion !== 1
  ) {
    return null;
  }
  if (
    candidate.item === null &&
    candidate.subtotal === null &&
    candidate.expiresAt === null
  ) {
    return {
      schemaVersion: 1,
      item: null,
      subtotal: null,
      expiresAt: null,
    };
  }
  if (
    !candidate.item ||
    typeof candidate.item !== "object" ||
    Array.isArray(candidate.item) ||
    typeof candidate.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(candidate.expiresAt))
  ) {
    return null;
  }
  const item = candidate.item as Record<string, unknown>;
  const price = parsePrice(item.price);
  const subtotal = parsePrice(candidate.subtotal);
  if (
    !exactKeys(item, ["brand", "name", "category", "finish", "price"]) ||
    !price ||
    !subtotal ||
    [item.brand, item.name, item.category, item.finish].some(
      (entry) => typeof entry !== "string" || entry.length === 0 || entry.length > 128,
    ) ||
    JSON.stringify(price) !== JSON.stringify(subtotal)
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    item: {
      brand: item.brand as string,
      name: item.name as string,
      category: item.category as string,
      finish: item.finish as string,
      price,
    },
    subtotal,
    expiresAt: candidate.expiresAt,
  };
}

function parseServerError(value: unknown, status: number): BagClientError {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const error = (value as Record<string, unknown>).error;
    if (error && typeof error === "object" && !Array.isArray(error)) {
      const code = (error as Record<string, unknown>).code;
      const message = (error as Record<string, unknown>).message;
      if (
        typeof code === "string" &&
        ERROR_CODES.has(code as BagClientErrorCode) &&
        typeof message === "string" &&
        message.length <= 256
      ) {
        return new BagClientError(code as BagClientErrorCode, message, status);
      }
    }
  }
  return new BagClientError("unavailable", "Bag is temporarily unavailable.", status);
}

export function createBagClient({
  request = fetch,
  timeoutMilliseconds = 4_500,
}: BagClientOptions = {}): BagClient {
  let confirmed: BagSnapshot | null = null;
  let operationTail: Promise<void> = Promise.resolve();

  async function execute(operation: BagOperation): Promise<BagSnapshot> {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      timeoutMilliseconds,
    );
    try {
      const maximumAttempts = operation === "read" ? 2 : 1;
      let response: Response | null = null;
      for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
        try {
          response = await request(PATHS[operation], {
            body: operation === "read" ? undefined : "{}",
            cache: "no-store",
            credentials: "same-origin",
            headers:
              operation === "read"
                ? { Accept: "application/json" }
                : {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
            method: operation === "read" ? "GET" : "POST",
            signal: controller.signal,
          });
        } catch (cause) {
          if (controller.signal.aborted) {
            throw new BagClientError(
              "timeout",
              "The Bag request timed out.",
              null,
            );
          }
          if (attempt + 1 < maximumAttempts) continue;
          throw new BagClientError(
            "network",
            "The Bag request could not connect.",
            null,
            { cause },
          );
        }
        if (
          attempt + 1 < maximumAttempts &&
          [502, 503, 504].includes(response.status)
        ) {
          await response.body?.cancel();
          continue;
        }
        break;
      }
      if (!response) {
        throw new BagClientError(
          "unavailable",
          "Bag is temporarily unavailable.",
          null,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new BagClientError(
          "invalid_response",
          "The Bag response was invalid.",
          response.status,
        );
      }
      if (!response.ok) throw parseServerError(payload, response.status);
      const snapshot = parseSnapshot(payload);
      if (!snapshot) {
        throw new BagClientError(
          "invalid_response",
          "The Bag response was invalid.",
          response.status,
        );
      }
      confirmed = snapshot;
      return snapshot;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  function schedule(operation: BagOperation): Promise<BagSnapshot> {
    const result = operationTail.then(() => execute(operation));
    operationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    read() {
      return schedule("read");
    },
    add() {
      return schedule("add");
    },
    remove() {
      return schedule("remove");
    },
    getConfirmed() {
      return confirmed;
    },
  };
}
