import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { AppError } from "../middleware/error.js";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis | null;
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

    if (!best) {
      throw new AppError(404, "ROUTE_NOT_AVAILABLE", "No active route recommendation available");
    }

    const formatAlt = (r: any) =>
      `${r.sourceChain?.shortName || r.sourceChain} → ${r.destChain?.shortName || r.destChain} (${(r.avgLatency || 0).toFixed(1)}s, ${(r.successRate || 0).toFixed(1)}% success)`;

    return {
      recommended: {
        path: `${best.sourceChain.shortName} → ${best.name} → ${best.destChain.shortName}`,
        reason: `${best.successRate.toFixed(1)}% success rate, ${best.avgLatency.toFixed(1)}s avg latency`,
        confidence: Math.min(99, best.successRate),
        bridgeHealth: best.status === "active" ? "Healthy" : "Degraded",
        mevForecast: best.successRate > 97 ? "Low risk" : "Medium risk",
        alternatives: alternatives.map(formatAlt),
      },
    };
  });

  app.get("/simulate", async () => {
    const best = await opts.prisma.route.findFirst({
      where: { status: "active" },
      orderBy: [{ successRate: "desc" }, { avgLatency: "asc" }],
      include: { sourceChain: true, destChain: true },
    });

    if (!best) {
      throw new AppError(404, "ROUTE_NOT_AVAILABLE", "No active route simulation available");
    }

    const fragments = 3;
    const perFragmentLatency = Math.max(1, best.avgLatency / fragments);
    const totalCost = ((best.totalVolume > 0 ? best.totalVolume * 0.0000001 : 0.1) + 0.05).toFixed(4);

    return {
      id: `sim-${Date.now()}`,
      status: "completed" as const,
      fragments: [
        { type: "wallet", label: "Source wallet", duration: "0.2s", cost: "$0.00" },
        { type: "split", label: `${fragments} fragments`, duration: "0.4s", cost: "$0.01" },
        { type: "bridge", label: `${best.sourceChain.shortName} → ${best.destChain.shortName}`, duration: `${perFragmentLatency.toFixed(1)}s`, cost: "$0.03" },
        { type: "swap", label: `${best.name}`, duration: `${perFragmentLatency.toFixed(1)}s`, cost: "$0.02" },
        { type: "settle", label: "Settlement verification", duration: "0.6s", cost: "$0.01" },
      ],
      totalDuration: `${(best.avgLatency + 1.2).toFixed(1)}s`,
      totalCost: `$${totalCost}`,
      confidence: Math.min(99, best.successRate),
    };
  });

  app.post("/compare", async (request) => {
    const body = request.body as { asset?: string; chain1?: string; chain2?: string };

    const [c1, c2] = await Promise.all([
      opts.prisma.chain.findFirst({
        where: {
          OR: [
            { name: body.chain1 ?? "Ethereum" },
            { shortName: (body.chain1 ?? "ETH").toUpperCase() },
            { id: (body.chain1 ?? "ethereum").toLowerCase() },
          ],
        },
      }),
      opts.prisma.chain.findFirst({
        where: {
          OR: [
            { name: body.chain2 ?? "Arbitrum" },
            { shortName: (body.chain2 ?? "ARB").toUpperCase() },
            { id: (body.chain2 ?? "arbitrum").toLowerCase() },
          ],
        },
      }),
    ]);

    if (!c1 || !c2) {
      throw new AppError(404, "CHAIN_NOT_FOUND", "Unable to compare chains: one or more chain records missing");
    }

    const c1Score = c1.mev;
    const c2Score = c2.mev;
    const recommendation = c1Score >= c2Score ? c1.name : c2.name;

    return {
      comparison: [
        { chain: c1.name, liquidity: `$${(c1.liquidity / 1e6).toFixed(0)}M`, spread: `${c1.spread}%`, gas: `${c1.gas} gwei`, latency: `${c1.latency}s`, score: c1Score },
        { chain: c2.name, liquidity: `$${(c2.liquidity / 1e6).toFixed(0)}M`, spread: `${c2.spread}%`, gas: `${c2.gas} gwei`, latency: `${c2.latency}s`, score: c2Score },
      ],
      recommendation,
      reason: `${recommendation} has stronger MEV protection score and route execution profile.`,
    };
  });
}
