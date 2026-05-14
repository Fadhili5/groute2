const LLAMA_BASE = "https://coins.llama.fi";
const tvlCache = new Map();
const CACHE_TTL = 300_000;
export async function getChainTvl(chain) {
    const cached = tvlCache.get(chain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.tvl;
    }
    try {
        const res = await fetch(`${LLAMA_BASE}/tvl/${encodeURIComponent(chain)}`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok)
            return null;
        const tvl = (await res.json());
        tvlCache.set(chain, { tvl, timestamp: Date.now() });
        return tvl;
    }
    catch {
        return cached?.tvl ?? null;
    }
}
export async function getCurrentPrices() {
    try {
        const res = await fetch("https://api.llama.fi/lite/prices/current", {
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok)
            return null;
        return (await res.json());
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=defillama.js.map