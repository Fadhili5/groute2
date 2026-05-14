const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60_000;

const TOKEN_IDS: Record<string, string> = {
  ETH: "ethereum",
  USDC: "usd-coin",
  USDT: "tether",
  BTC: "bitcoin",
  SOL: "solana",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  ARB: "arbitrum",
};

export async function getTokenPrice(symbol: string): Promise<number | null> {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  const coinId = TOKEN_IDS[symbol.toUpperCase()];
  if (!coinId) return null;

  try {
    const res = await fetch(`${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, any>;
    const price = data[coinId]?.usd ?? null;
    if (price) {
      priceCache.set(symbol, { price, timestamp: Date.now() });
    }
    return price;
  } catch {
    return cached?.price ?? null;
  }
}

export async function getTokenPrices(symbols: string[]): Promise<Record<string, number | null>> {
  const results: Record<string, number | null> = {};
  const uncached: string[] = [];

  for (const sym of symbols) {
    const cached = priceCache.get(sym);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      results[sym] = cached.price;
    } else {
      uncached.push(sym);
    }
  }

  if (uncached.length > 0) {
    const ids = uncached.map((s) => TOKEN_IDS[s.toUpperCase()]).filter(Boolean).join(",");
    if (ids) {
      try {
        const res = await fetch(`${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = (await res.json()) as Record<string, any>;
          for (const sym of uncached) {
            const coinId = TOKEN_IDS[sym.toUpperCase()];
            const price = data[coinId]?.usd ?? null;
            results[sym] = price;
            if (price) priceCache.set(sym, { price, timestamp: Date.now() });
          }
        }
      } catch { /* use defaults */ }
    }
  }

  return results;
}

export function getCachedPrices(): Record<string, { price: number; age: number }> {
  const now = Date.now();
  const result: Record<string, { price: number; age: number }> = {};
  priceCache.forEach((v, k) => {
    result[k] = { price: v.price, age: now - v.timestamp };
  });
  return result;
}
