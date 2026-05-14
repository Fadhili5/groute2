const FALLBACK_CHAINS = [
    { id: "ethereum", name: "Ethereum", shortName: "ETH", chainId: 1, status: "healthy", liquidity: 842_000_000, spread: 0.02, gas: 12.4, bridgeFee: 0.05, slippage: 0.01, latency: 12, privacy: 85, mev: 92, eta: "12s" },
    { id: "arbitrum", name: "Arbitrum", shortName: "ARB", chainId: 42161, status: "healthy", liquidity: 456_000_000, spread: 0.03, gas: 0.08, bridgeFee: 0.03, slippage: 0.02, latency: 3, privacy: 78, mev: 85, eta: "8s" },
    { id: "base", name: "Base", shortName: "BASE", chainId: 8453, status: "healthy", liquidity: 234_000_000, spread: 0.04, gas: 0.06, bridgeFee: 0.04, slippage: 0.03, latency: 2, privacy: 72, mev: 80, eta: "6s" },
    { id: "solana", name: "Solana", shortName: "SOL", chainId: 101, status: "healthy", liquidity: 678_000_000, spread: 0.01, gas: 0.0002, bridgeFee: 0.02, slippage: 0.01, latency: 1, privacy: 45, mev: 60, eta: "4s" },
    { id: "avalanche", name: "Avalanche", shortName: "AVAX", chainId: 43114, status: "degraded", liquidity: 189_000_000, spread: 0.05, gas: 0.15, bridgeFee: 0.06, slippage: 0.04, latency: 5, privacy: 70, mev: 75, eta: "10s" },
    { id: "bnb", name: "BNB Chain", shortName: "BNB", chainId: 56, status: "healthy", liquidity: 312_000_000, spread: 0.03, gas: 0.04, bridgeFee: 0.04, slippage: 0.02, latency: 4, privacy: 55, mev: 65, eta: "7s" },
];
const FALLBACK_POOLS = [
    { chain: "ETH", chainName: "Ethereum", token: "USDC", depth: 320, utilization: 72, apy: 4.2, volume24h: 456, fee: 0.003 },
    { chain: "ETH", chainName: "Ethereum", token: "USDT", depth: 280, utilization: 68, apy: 3.8, volume24h: 389, fee: 0.003 },
    { chain: "ETH", chainName: "Ethereum", token: "ETH", depth: 420, utilization: 81, apy: 2.1, volume24h: 234, fee: 0.005 },
    { chain: "ARB", chainName: "Arbitrum", token: "USDC", depth: 220, utilization: 65, apy: 5.8, volume24h: 312, fee: 0.003 },
    { chain: "BASE", chainName: "Base", token: "USDC", depth: 140, utilization: 58, apy: 4.9, volume24h: 178, fee: 0.003 },
    { chain: "SOL", chainName: "Solana", token: "USDC", depth: 410, utilization: 81, apy: 6.9, volume24h: 534, fee: 0.003 },
    { chain: "AVAX", chainName: "Avalanche", token: "USDC", depth: 95, utilization: 45, apy: 5.1, volume24h: 112, fee: 0.003 },
    { chain: "BNB", chainName: "BNB Chain", token: "USDC", depth: 170, utilization: 55, apy: 4.4, volume24h: 223, fee: 0.003 },
];
export async function marketRoutes(app, opts) {
    app.get("/chains", async () => {
        if (!opts.prisma)
            return { chains: FALLBACK_CHAINS };
        const chains = await opts.prisma.chain.findMany({ orderBy: { name: "asc" } });
        return { chains: chains.length ? chains : FALLBACK_CHAINS };
    });
    app.get("/chains/:id", async (request, reply) => {
        const { id } = request.params;
        if (!opts.prisma) {
            const chain = FALLBACK_CHAINS.find((c) => c.id === id || c.shortName === id.toUpperCase() || c.name === id);
            if (!chain)
                return reply.status(404).send({ error: { code: "CHAIN_NOT_FOUND", message: `Chain ${id} not found` } });
            return chain;
        }
        const chain = await opts.prisma.chain.findFirst({
            where: { OR: [{ id }, { shortName: id.toUpperCase() }, { name: id }] },
        });
        if (!chain)
            return reply.status(404).send({ error: { code: "CHAIN_NOT_FOUND", message: `Chain ${id} not found` } });
        return chain;
    });
    app.get("/liquidity", async () => {
        if (!opts.prisma)
            return { pools: FALLBACK_POOLS };
        const pools = await opts.prisma.liquidityPool.findMany({
            include: { chain: true },
            orderBy: { depth: "desc" },
        });
        if (!pools.length)
            return { pools: FALLBACK_POOLS };
        return {
            pools: pools.map((p) => ({
                id: p.id,
                chain: p.chain.shortName,
                chainName: p.chain.name,
                token: p.token,
                depth: p.depth,
                utilization: p.utilization,
                apy: p.apy,
                volume24h: p.volume24h,
                fee: p.fee,
            })),
        };
    });
    app.get("/ticker", async () => {
        if (!opts.prisma) {
            return {
                items: FALLBACK_CHAINS.slice(0, 3).map((c) => ({
                    type: "chain",
                    message: `${c.shortName}: gas ${c.gas} | liq $${(c.liquidity / 1e6).toFixed(0)}M | ${c.status}`,
                    severity: c.status === "healthy" ? "info" : "warning",
                })),
            };
        }
        const [chains, alerts] = await Promise.all([
            opts.prisma.chain.findMany({ orderBy: { name: "asc" }, take: 3 }),
            opts.prisma.alert.findMany({ where: { read: false }, orderBy: { createdAt: "desc" }, take: 3 }),
        ]);
        const items = [
            ...chains.map((c) => ({
                type: "chain",
                message: `${c.shortName}: gas ${c.gas} | liq $${(c.liquidity / 1e6).toFixed(0)}M | ${c.status}`,
                severity: c.status === "healthy" ? "info" : "warning",
            })),
            ...(alerts || []).map((a) => ({ type: a.type, message: a.message, severity: a.severity })),
        ];
        return { items };
    });
}
//# sourceMappingURL=market.js.map