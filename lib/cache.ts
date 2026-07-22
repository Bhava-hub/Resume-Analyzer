import { db } from '@/lib/db';
import { apiCache } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A cache entry is just: who made the call, what was the query, and what came back.
 * The response is stored as JSONB so it can hold any shape of data.
 */
export type CacheProvider = 'youtube' | 'tavily' | 'groq-simplify';

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Look up a cached response.
 *
 * Returns the cached value (T) if a non-expired entry exists, or null if:
 * - No entry found for this provider+query combination
 * - The entry exists but has expired (expiresAt < NOW)
 *
 * Usage:
 *   const cached = await getCached<YouTubeVideo[]>('youtube', query);
 *   if (cached) return cached; // use it directly
 */
export async function getCached<T>(
  provider: CacheProvider,
  query: string,
): Promise<T | null> {
  try {
    const rows = await db
      .select()
      .from(apiCache)
      .where(
        and(
          eq(apiCache.apiProvider, provider),
          eq(apiCache.query, query),
          // Only return entries that haven't expired yet
          gt(apiCache.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;

    console.log(`[cache] HIT — ${provider}: "${query.slice(0, 60)}"`);
    return rows[0].response as T;
  } catch (err) {
    // Cache read errors are non-fatal — just proceed without cache
    console.warn(`[cache] Read error (${provider}):`, err);
    return null;
  }
}

/**
 * Save a response to the cache.
 *
 * ttlSeconds controls how long until this entry expires:
 *   - 86400  = 24 hours  (Tavily, Groq — content changes daily)
 *   - 604800 = 7 days    (YouTube — video rankings are stable)
 *
 * Usage:
 *   await setCached('youtube', query, videos, 604800);
 */
export async function setCached<T>(
  provider: CacheProvider,
  query: string,
  response: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await db.insert(apiCache).values({
      apiProvider: provider,
      query,
      response: response as Record<string, unknown>,
      expiresAt,
    });

    console.log(`[cache] SET — ${provider}: "${query.slice(0, 60)}" (TTL: ${ttlSeconds}s)`);
  } catch (err) {
    // Cache write errors are non-fatal — the caller already has the real response
    console.warn(`[cache] Write error (${provider}):`, err);
  }
}
