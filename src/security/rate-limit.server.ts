import "server-only";

type RateLimitEntry = {
  count: number;
  resetsAt: number;
};

const MAXIMUM_KEYS = 1_024;
const entries = new Map<string, RateLimitEntry>();

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function requestRateLimitKey(request: Request): string {
  const netlifyAddress = request.headers
    .get("x-nf-client-connection-ip")
    ?.trim();
  if (process.env.NETLIFY === "true" && netlifyAddress) {
    return netlifyAddress.slice(0, 128);
  }
  if (process.env.NODE_ENV !== "production") {
    return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
      "local";
  }
  return "unknown";
}

export function consumeRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMilliseconds: number,
  now = Date.now(),
): RateLimitDecision {
  for (const [candidate, entry] of entries) {
    if (entry.resetsAt <= now) entries.delete(candidate);
  }

  const compositeKey = `${scope}:${key}`;
  const existing = entries.get(compositeKey);
  if (!existing) {
    if (entries.size >= MAXIMUM_KEYS) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(windowMilliseconds / 1_000),
      };
    }
    entries.set(compositeKey, {
      count: 1,
      resetsAt: now + windowMilliseconds,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetsAt - now) / 1_000),
      ),
    };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimitsForTesting(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Rate limits can be reset only in tests");
  }
  entries.clear();
}
