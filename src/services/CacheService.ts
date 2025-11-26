/**
 * CacheService - In-memory caching service with TTL support
 * Provides efficient data caching to reduce unnecessary API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // Default 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from endpoint and params
   */
  private generateKey(endpoint: string, params?: Record<string, any>): string {
    if (!params) return endpoint;
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get data from cache
   */
  get<T>(endpoint: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(endpoint: string, data: T, params?: Record<string, any>, ttl?: number): void {
    const key = this.generateKey(endpoint, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(endpoint: string, params?: Record<string, any>): void {
    const key = this.generateKey(endpoint, params);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.cache.keys());

    keys.forEach((key) => {
      const entry = this.cache.get(key);
      if (entry && now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    });
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Auto cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheService.cleanup();
  }, 10 * 60 * 1000);
}
