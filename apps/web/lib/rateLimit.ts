// In-memory fixed-window rate limiter for the public API routes.
//
// This is intentionally small and dependency-free: enough to blunt bursts and
// scripted abuse against /api/verify and /api/approve in the demo/single-instance
// deployment. It is NOT a distributed limiter — production behind multiple
// instances swaps rateLimit() for a shared store (Upstash/Redis) while keeping
// the same call shape at the routes. The window math lives in evaluateWindow(),
// a pure function unit-tested without touching the clock.

// The counter map must be a process-wide singleton. Next bundles each route
// handler separately, so a plain module-level Map would be duplicated per route
// and windows would not be shared across /api/verify and /api/approve. Stashing
// it on globalThis gives one instance across every route bundle and survives dev
// HMR reloads — the same pattern lib/agents.ts uses for its in-memory state.
interface RateLimitStore {
  windows: Map<string, WindowState>;
}
const globalForRateLimit = globalThis as unknown as {
  __helixRateLimit?: RateLimitStore;
};
const store: RateLimitStore = (globalForRateLimit.__helixRateLimit ??= {
  windows: new Map<string, WindowState>(),
});

// Defaults: 30 requests per 60s per key. Generous for a human at a front desk,
// tight enough to stop a scripted flood.
const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000;

/** The stored counter for one key: how many hits, and when the window opened. */
export interface WindowState {
  count: number;
  windowStart: number;
}

/** Result of evaluating a hit against a window. `next` is the state to persist. */
export interface WindowEval {
  ok: boolean;
  remaining: number;
  resetMs: number;
  next: WindowState;
}

/** What a route needs to shape its response: allow/deny, budget left, and how
 *  long to ask a blocked caller to wait. */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Pure fixed-window decision. Given the current stored state (or undefined for a
 * first-ever hit), the current time, and the window config, decide whether this
 * hit is admitted and return the state to store next. No clock, no globals — the
 * caller injects `nowMs`, which is what makes this unit-testable and
 * deterministic.
 *
 * Semantics:
 *  - No state, or the window has elapsed → open a fresh window at nowMs, admit.
 *  - Within the window, under the limit → admit and increment.
 *  - Within the window, at the limit → reject WITHOUT incrementing (a blocked
 *    hit does not extend the penalty; the window still resets on schedule).
 *
 * Never mutates the input state — returns a new `next` object when counting.
 */
export function evaluateWindow(
  state: WindowState | undefined,
  nowMs: number,
  limit: number,
  windowMs: number,
): WindowEval {
  const isNewWindow = !state || nowMs - state.windowStart >= windowMs;
  if (isNewWindow) {
    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
      resetMs: windowMs,
      next: { count: 1, windowStart: nowMs },
    };
  }

  const resetMs = state.windowStart + windowMs - nowMs;
  if (state.count >= limit) {
    return { ok: false, remaining: 0, resetMs, next: state };
  }

  const count = state.count + 1;
  return {
    ok: true,
    remaining: Math.max(0, limit - count),
    resetMs,
    next: { count, windowStart: state.windowStart },
  };
}

/**
 * Record a hit for `key` and decide whether to admit it. Reads the shared window
 * map, runs the pure evaluateWindow with the real clock, writes the new state
 * back, and returns the route-facing result. retryAfterMs is 0 when admitted and
 * the ms-until-reset when blocked (the route turns it into a Retry-After header).
 */
export function rateLimit(
  key: string,
  opts?: { limit?: number; windowMs?: number },
): RateLimitResult {
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;

  const result = evaluateWindow(store.windows.get(key), Date.now(), limit, windowMs);
  store.windows.set(key, result.next);

  return {
    ok: result.ok,
    remaining: result.remaining,
    retryAfterMs: result.ok ? 0 : result.resetMs,
  };
}

/**
 * Derive a stable bucketing key for a request from its forwarding headers. Uses
 * the first hop of `x-forwarded-for` (the original client through Vercel's proxy)
 * and falls back to `x-real-ip`, then "local" when neither is present (direct
 * localhost hits in dev).
 *
 * PRIVACY: the returned value can be an IP and is used ONLY as an opaque map key.
 * It is never logged — keep it that way at every call site (no-PHI-in-logs
 * discipline extends to IPs here).
 */
export function clientKey(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "local";
}
