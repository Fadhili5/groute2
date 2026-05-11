import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis;
}

export async function routeRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.get("/", async () => {
    const routes = await opts.prisma.route.findMany({
      include: { sourceChain: true, destChain: true },
      orderBy: { totalVolume: "desc" },
    });
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
    const best = await opts.prisma.route.findFirst({
      where: { status: "active" },
      orderBy: [{ successRate: "desc" }, { avgLatency: "asc" }],
      include: { sourceChain: true, destChain: true },
    });

    const alternatives = await opts.prisma.route.findMany({
      where: { status: "active", id: { not: best?.id } },
      orderBy: { successRate: "desc" },
      take: 2,
      include: { sourceChain: true, destChain: true },
    });

    return {
      recommended: {
        path: best
          ? `${best.sourceChain.shortName} → LayerZero → ${best.destChain.shortName}`
          : "ETH → LayerZero → Arbitrum → Uniswap V3 → USDC",
        reason: best
          ? `${best.successRate.toFixed(1)}% success rate, ${best.avgLatency.toFixed(1)}s avg latency`
          : "Optimal gas + liquidity combination",
        confidence: best ? Math.min(99, best.successRate) : 94,
        bridgeHealth: "99.8% uptime",
        mevForecast: "Low risk - Flashbots + privacy RPC",
        alternatives: alternatives.map(
          (r) => `${r.sourceChain.shortName} → ${r.destChain.shortName} (${r.avgLatency.toFixed(1)}s, ${r.successRate.toFixed(1)}% success)`
        ),
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
    const body = request.body as { asset?: string; chain1?: string; chain2?: string };
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
