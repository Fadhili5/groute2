const FALLBACK_ROUTES = [
    { id: "1", name: "ETH-USDC Arbitrum Express", sourceChain: "Ethereum", destChain: "Arbitrum", avgLatency: 8.4, successRate: 99.2, totalVolume: 142_000_000, status: "active" },
    { id: "2", name: "USDT Base Solana", sourceChain: "Base", destChain: "Solana", avgLatency: 6.2, successRate: 97.8, totalVolume: 89_000_000, status: "active" },
    { id: "3", name: "BTC Avalanche Bridge", sourceChain: "Ethereum", destChain: "Avalanche", avgLatency: 14.1, successRate: 95.4, totalVolume: 45_000_000, status: "active" },
    { id: "4", name: "AVAX BNB Express", sourceChain: "Avalanche", destChain: "BNB Chain", avgLatency: 11.3, successRate: 93.1, totalVolume: 28_000_000, status: "degraded" },
    { id: "5", name: "ETH Base Express", sourceChain: "Ethereum", destChain: "Base", avgLatency: 4.2, successRate: 98.5, totalVolume: 67_000_000, status: "active" },
    { id: "6", name: "ARB SOL Bridge", sourceChain: "Arbitrum", destChain: "Solana", avgLatency: 9.8, successRate: 96.1, totalVolume: 34_000_000, status: "active" },
];
export async function routeRoutes(app, opts) {
    app.get("/", async () => {
        if (!opts.prisma)
            return { routes: FALLBACK_ROUTES };
        const routes = await opts.prisma.route.findMany({
            include: { sourceChain: true, destChain: true },
            orderBy: { totalVolume: "desc" },
        });
        if (!routes.length)
            return { routes: FALLBACK_ROUTES };
        return {
            routes: routes.map((r) => ({
                id: r.id,
                name: r.name,
                sourceChain: r.sourceChain.name,
                destChain: r.destChain.name,
                avgLatency: r.avgLatency,
                successRate: r.successRate,
                totalVolume: r.totalVolume,
                status: r.status,
            })),
        };
    });
    app.get("/recommend", async () => {
        let best = null;
        let alternatives = [];
        if (opts.prisma) {
            best = await opts.prisma.route.findFirst({
                where: { status: "active" },
                orderBy: [{ successRate: "desc" }, { avgLatency: "asc" }],
                include: { sourceChain: true, destChain: true },
            });
            alternatives = await opts.prisma.route.findMany({
                where: { status: "active", id: { not: best?.id } },
                orderBy: { successRate: "desc" },
                take: 2,
                include: { sourceChain: true, destChain: true },
            });
        }
        else {
            best = FALLBACK_ROUTES[0];
            alternatives = FALLBACK_ROUTES.slice(1, 3);
        }
        const formatAlt = (r) => `${r.sourceChain?.shortName || r.sourceChain} → ${r.destChain?.shortName || r.destChain} (${(r.avgLatency || 0).toFixed(1)}s, ${(r.successRate || 0).toFixed(1)}% success)`;
        return {
            recommended: {
                path: best
                    ? `${best.sourceChain?.shortName || best.sourceChain} → LayerZero → ${best.destChain?.shortName || best.destChain}`
                    : "ETH → LayerZero → Arbitrum → Uniswap V3 → USDC",
                reason: best
                    ? `${best.successRate?.toFixed(1) || "99.0"}% success rate, ${best.avgLatency?.toFixed(1) || "8.0"}s avg latency`
                    : "Optimal gas + liquidity combination",
                confidence: best ? Math.min(99, best.successRate || 99) : 94,
                bridgeHealth: "99.8% uptime",
                mevForecast: "Low risk - Flashbots + privacy RPC",
                alternatives: alternatives.map(formatAlt),
            },
        };
    });
    app.get("/simulate", async () => ({
        id: `sim-${Date.now()}`,
        status: "completed",
        fragments: [
            { type: "wallet", label: "Source wallet", duration: "0.2s", cost: "$0.00" },
            { type: "split", label: "3 fragments", duration: "0.5s", cost: "$0.01" },
            { type: "bridge", label: "LayerZero → Arbitrum", duration: "2.1s", cost: "$0.05" },
            { type: "swap", label: "Uniswap V3: USDC → ETH", duration: "1.8s", cost: "$0.03" },
            { type: "settle", label: "Settlement verification", duration: "0.5s", cost: "$0.01" },
        ],
        totalDuration: "5.1s",
        totalCost: "$0.10",
        confidence: 94.2,
    }));
    app.post("/compare", async (request) => {
        const body = request.body;
        if (!opts.prisma) {
            const chain1 = FALLBACK_ROUTES.find((r) => r.sourceChain.includes(body.chain1 || "")) || FALLBACK_ROUTES[0];
            const chain2 = FALLBACK_ROUTES.find((r) => r.destChain.includes(body.chain2 || "")) || FALLBACK_ROUTES[1];
            return {
                comparison: [
                    { chain: body.chain1 || "Ethereum", liquidity: "$842M", spread: "0.02%", gas: "12.4 gwei", latency: "12s", score: 92 },
                    { chain: body.chain2 || "Arbitrum", liquidity: "$456M", spread: "0.03%", gas: "0.08 gwei", latency: "3s", score: 85 },
                ],
                recommendation: body.chain2 || "Arbitrum",
                reason: "Lower gas costs and faster finality outweigh slightly lower liquidity depth.",
            };
        }
        const [c1, c2] = await Promise.all([
            opts.prisma.chain.findFirst({ where: { name: body.chain1 ?? "Ethereum" } }),
            opts.prisma.chain.findFirst({ where: { name: body.chain2 ?? "Arbitrum" } }),
        ]);
        return {
            comparison: [
                { chain: c1?.name ?? body.chain1, liquidity: `$${((c1?.liquidity ?? 842e6) / 1e6).toFixed(0)}M`, spread: `${c1?.spread ?? 0.02}%`, gas: `${c1?.gas ?? 12.4} gwei`, latency: `${c1?.latency ?? 12}s`, score: c1?.mev ?? 92 },
                { chain: c2?.name ?? body.chain2, liquidity: `$${((c2?.liquidity ?? 456e6) / 1e6).toFixed(0)}M`, spread: `${c2?.spread ?? 0.03}%`, gas: `${c2?.gas ?? 0.08} gwei`, latency: `${c2?.latency ?? 3}s`, score: c2?.mev ?? 85 },
            ],
            recommendation: c2?.name ?? body.chain2,
            reason: "Lower gas costs and faster finality outweigh slightly lower liquidity depth.",
        };
    });
}
//# sourceMappingURL=routes.js.map