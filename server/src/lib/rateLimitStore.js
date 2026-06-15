// Pluggable store for express-rate-limit.
//
// The default in-memory store only counts requests within a single process, so
// on Vercel (many short-lived function instances) or multiple Railway replicas
// the effective limit is far looser than configured. Set REDIS_URL to share
// counters across every instance.
//
// Redis is optional and loaded lazily — if REDIS_URL is unset, or the redis
// packages aren't installed, or the connection fails, we fall back to the
// in-memory store so the app keeps working.

let _clientPromise = null;

async function getClient(url) {
  if (!_clientPromise) {
    _clientPromise = (async () => {
      const { default: IORedis } = await import("ioredis");
      const client = new IORedis(url, { maxRetriesPerRequest: 2 });
      client.on("error", (e) => console.error("[ratelimit] Redis error:", e.message));
      return client;
    })();
  }
  return _clientPromise;
}

/**
 * Returns a RedisStore when REDIS_URL is configured and usable, otherwise
 * `undefined` (which makes express-rate-limit use its default MemoryStore).
 *
 * @param {string} prefix - distinct per limiter so their counters don't collide.
 */
export async function makeRateLimitStore(prefix) {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;

  try {
    const { default: RedisStore } = await import("rate-limit-redis");
    const client = await getClient(url);
    console.log(`[ratelimit] Using Redis store (prefix "rl:${prefix}:") for cross-instance limits.`);
    return new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: (...args) => client.call(...args),
    });
  } catch (e) {
    console.warn(
      `[ratelimit] REDIS_URL is set but Redis is unavailable (${e.message}). Falling back to in-memory store.`
    );
    return undefined;
  }
}
