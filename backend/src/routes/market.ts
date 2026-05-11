import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis;
}

export async function marketRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.get("/chains", async () => {
    const chains = await opts.prisma.chain.findMany({ orderBy: { name: "asc" } });
    return { chains };
  });

  app.get("/chains/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const chain = await opts.prisma.chain.findFirst({
      where: { OR: [{ id }, { shortName: id.toUpperCase() }, { name: id }] },
    });
    if (!chain) return reply.status(404).send({ error: { code: "CHAIN_NOT_FOUND", message: `Chain ${id} not found` } });
    return chain;
  });

  app.get("/liquidity", async () => {
    const pools = await opts.prisma.liquidityPool.findMany({
      include: { chain: true },
      orderBy: { depth: "desc" },
    });
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
      ...alerts.map((a) => ({ type: a.type, message: a.message, severity: a.severity })),
    ];
    return { items };
  });
}
