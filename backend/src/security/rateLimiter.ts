export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return {
    check(key: string): boolean {
      const now = Date.now();
      const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (timestamps.length >= maxAttempts) {
        hits.set(key, timestamps);
        return false;
      }
      timestamps.push(now);
      hits.set(key, timestamps);
      return true;
    },
  };
}
