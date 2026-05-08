import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";
import { v4 as uuid } from "uuid";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis;
}

const simulateSchema = z.object({
  sourceAsset: z.string(),
  destinationAsset: z.string(),
  sourceChain: z.string(),
  destinationChain: z.string(),
  amount: z.number().positive(),
  privacyMode: z.boolean(),
  fragmentationMode: z.boolean(),
  slippageTolerance: z.number().min(0).max(100),
  bridgePreference: z.string(),
  mevGuard: z.boolean(),
});

export async function executionRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.post("/simulate", async (request, reply) => {
    const data = simulateSchema.parse(request.body);

    const result = {
      id: uuid(),
      gas: Math.random() * 0.01,
      bridgeFee: data.amount * 0.0005,
      slippage: data.slippageTolerance * 0.001,
      eta: `${(Math.random() * 15 + 2).toFixed(1)}s`,
      confidence: Math.random() * 20 + 78,
      fragments: Math.floor(Math.random() * 3) + 2,
      route: `${data.sourceAsset} \u2192 ${data.destinationAsset} via ${data.bridgePreference}`,
      fee: data.amount * 0.003,
    };

    await opts.redis.setex(`simulate:${result.id}`, 300, JSON.stringify(result));
    return result;
  });

  app.post("/optimize", async (request, reply) => {
    const data = simulateSchema.parse(request.body);

    const result = {
      id: uuid(),
      optimizedRoute: `${data.sourceChain} \u2192 Arbitrum \u2192 ${data.destinationChain}`,
      gas: `${(Math.random() * 5 + 0.1).toFixed(2)} gwei`,
      savings: `${(Math.random() * 30 + 5).toFixed(1)}%`,
      confidence: Math.random() * 10 + 88,
      bridges: ["LayerZero", "Across"],
      fragments: Math.floor(Math.random() * 3) + 1,
      privacyScore: Math.floor(Math.random() * 30) + 65,
    };

    await opts.redis.setex(`optimize:${result.id}`, 300, JSON.stringify(result));
    return result;
  });

  app.post("/execute", async (request, reply) => {
    const data = simulateSchema.parse(request.body);

    const order = {
      id: uuid(),
      ...data,
      status: "executing",
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      timestamp: Date.now(),
    };

    await opts.redis.setex(`execution:${order.id}`, 3600, JSON.stringify(order));

    setTimeout(async () => {
      order.status = "completed";
      await opts.redis.setex(`execution:${order.id}`, 3600, JSON.stringify(order));
    }, 5000);

    return order;
  });

  app.get("/orders", async (request, reply) => {
    const keys = await opts.redis.keys("execution:*");
    const orders = [];
    for (const key of keys) {
      const data = await opts.redis.get(key);
      if (data) orders.push(JSON.parse(data));
    }
    return orders.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  });

  app.get("/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await opts.redis.get(`execution:${id}`);
    if (!data) {
      return reply.status(404).send({ error: { code: "ORDER_NOT_FOUND", message: "Order not found" } });
    }
    return JSON.parse(data);
  });
}
