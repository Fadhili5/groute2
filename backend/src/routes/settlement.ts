import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";
import { v4 as uuid } from "uuid";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis;
}

const inspectSchema = z.object({
  txHash: z.string().optional(),
  routeId: z.string().optional(),
});

export async function settlementRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.get("/proofs", async () => {
    return {
      proofs: [
        {
          txHash: "0x7f3c8a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
          routeId: "0x9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
          proofHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
          state: "confirmed",
          fees: 12.45,
          relayer: "0x8f3c7a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
          confirmations: 32,
          timestamp: Date.now() - 30000,
        },
        {
          txHash: "0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b",
          routeId: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
          proofHash: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
          state: "finalized",
          fees: 8.30,
          relayer: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
          confirmations: 64,
          timestamp: Date.now() - 120000,
        },
      ],
    };
  });

  app.get("/verify/:txHash", async (request, reply) => {
    const { txHash } = request.params as { txHash: string };

    const result = {
      verified: true,
      txHash,
      block: 19876543,
      confirmations: 32,
      timestamp: Date.now() - 30000,
      state: "confirmed",
      chainId: 1,
    };

    await opts.redis.setex(`verify:${txHash}`, 300, JSON.stringify(result));
    return result;
  });

  app.post("/inspect", async (request, reply) => {
    const data = inspectSchema.parse(request.body);

    const result = {
      txHash: data.txHash || `0x${uuid().replace(/-/g, "")}`,
      routeId: data.routeId || uuid(),
      proofHash: `0x${uuid().replace(/-/g, "")}`,
      state: "confirmed",
      fees: Math.random() * 20 + 5,
      relayer: `0x${uuid().replace(/-/g, "").slice(0, 40)}`,
      confirmations: Math.floor(Math.random() * 64) + 1,
      timestamp: Date.now(),
    };

    return result;
  });
}
