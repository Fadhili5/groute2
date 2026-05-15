import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis | null;
}

const inspectSchema = z.object({
  txHash: z.string().optional(),
  routeId: z.string().optional(),
});

export async function settlementRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.get("/proofs", async () => {
    const settlements = await opts.prisma.settlement.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      proofs: settlements.map((s) => ({
        txHash: s.txHash,
        routeId: s.routeId,
        proofHash: s.proofHash,
        state: s.state,
        fees: s.fee,
        relayer: s.relayerAddress,
        confirmations: s.confirmations,
        timestamp: s.createdAt.getTime(),
      })),
    };
  });

  app.get("/verify/:txHash", async (request, reply) => {
    const { txHash } = request.params as { txHash: string };

    const settlement = await opts.prisma.settlement.findUnique({ where: { txHash } });
    if (!settlement) {
      return reply.status(404).send({ error: { code: "PROOF_NOT_FOUND", message: "Transaction proof not found" } });
    }
    return {
      verified: settlement.state !== "pending",
      txHash,
      block: 19876543,
      confirmations: settlement.confirmations,
      timestamp: settlement.createdAt.getTime(),
      state: settlement.state,
      chainId: 1,
    };
  });

  app.post("/inspect", async (request, reply) => {
    const data = inspectSchema.parse(request.body);
    if (!data.txHash && !data.routeId) {
      return reply.status(400).send({ error: { code: "INSPECT_PARAMS_REQUIRED", message: "Provide txHash or routeId" } });
    }

    const settlement = await opts.prisma.settlement.findFirst({
      where: {
        OR: [
          ...(data.txHash ? [{ txHash: data.txHash }] : []),
          ...(data.routeId ? [{ routeId: data.routeId }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!settlement) {
      return reply.status(404).send({ error: { code: "SETTLEMENT_NOT_FOUND", message: "No settlement found for provided identifiers" } });
    }

    return {
      txHash: settlement.txHash,
      routeId: settlement.routeId,
      proofHash: settlement.proofHash,
      state: settlement.state,
      fees: settlement.fee,
      relayer: settlement.relayerAddress,
      confirmations: settlement.confirmations,
      timestamp: settlement.createdAt.getTime(),
    };
  });
}
