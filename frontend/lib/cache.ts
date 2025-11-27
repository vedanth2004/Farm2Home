/**
 * Simple In-Memory Cache with TTL
 * For production, consider using Redis (already in dependencies: @upstash/redis)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 60 * 1000; // 1 minute default

  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

export const cache = new SimpleCache();

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      cache.cleanup();
    },
    5 * 60 * 1000,
  );
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  metrics: (timeframe: string, role?: string) =>
    `metrics:${timeframe}:${role || "all"}`,
  orders: (page: number, limit: number, filters?: string) =>
    `orders:${page}:${limit}:${filters || "none"}`,
  products: (page: number, limit: number, filters?: string) =>
    `products:${page}:${limit}:${filters || "none"}`,
  user: (userId: string) => `user:${userId}`,
  farmer: (farmerId: string) => `farmer:${farmerId}`,
};
