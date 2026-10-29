// lib/rate-limit.ts

interface RateLimitEntry {
  count: number;
  windowStart: number; // timestamp in ms
}

// This Map lives in memory for the lifetime of the Render process.
// Key = IP address, Value = { count, windowStart }
const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS = 5;       // max 5 requests per IP per 60s

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(ip);

  // No previous requests from this IP — create a fresh entry and allow
  if (!entry) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  const elapsed = now - entry.windowStart;

  // Window has expired — reset their counter and allow
  if (elapsed > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Still inside the window
  if (entry.count >= MAX_REQUESTS) {
    // Tell them exactly how many ms until their window resets
    const retryAfterMs = WINDOW_MS - elapsed;
    return { allowed: false, retryAfterMs };
  }

  // Under the limit — increment and allow
  entry.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}
