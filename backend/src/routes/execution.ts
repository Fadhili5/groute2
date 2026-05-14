import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";
import { v4 as uuid } from "uuid";

interface RouteOptions {
  prisma: PrismaClient | null;
  redis: Redis | null;
}

const simulateSchema = z.object({
  sourceAsset: z.string().min(1),
  destinationAsset: z.string().min(1),
  sourceChain: z.string().min(1),
  destinationChain: z.string().min(1),
  amount: z.number().positive(),
  privacyMode: z.boolean(),
  fragmentationMode: z.boolean(),
  slippageTolerance: z.number().min(0).max(100),
  bridgePreference: z.string(),
  mevGuard: z.boolean(),
});

const CHAIN_GAS_MAP: Record<string, number> = {
  ethereum: 12.4, arbitrum: 0.08, base: 0.06, solana: 0.0002, avalanche: 0.15, bnb: 0.04,
  Ethereum: 12.4, Arbitrum: 0.08, Base: 0.06, Solana: 0.0002, Avalanche: 0.15, "BNB Chain": 0.04,
};

function estimateCost(data: z.infer<typeof simulateSchema>) {
  const baseGas = CHAIN_GAS_MAP[data.sourceChain] || 5;
  const gasCost = baseGas * data.amount * 0.0001;
  const bridgeFee = data.amount * 0.0005;
  const slippageVal = data.amount * (data.slippageTolerance / 100) * 0.001;
  const totalFee = data.amount * 0.003;
  const privacyOverhead = data.privacyMode ? 1.15 : 1.0;
  const fragOverhead = data.fragmentationMode ? 1.05 : 1.0;
  return {
    gas: gasCost * privacyOverhead,
    bridgeFee: bridgeFee * fragOverhead,
    slippage: data.slippageTolerance * 0.001,
    fee: totalFee,
    total: (gasCost + bridgeFee + slippageVal + totalFee) * privacyOverhead * fragOverhead,
  };
}

function estimateFragments(amount: number, fragMode: boolean): number {
  if (!fragMode) return 1;
  if (amount > 1_000_000) return 5;
  if (amount > 100_000) return 3;
  return 2;
}

function estimateConfidence(amount: number, mevGuard: boolean): number {
  const base = 94;
  const sizePenalty = Math.min(amount / 10_000_000, 0.15) * 100;
  const mevBonus = mevGuard ? 3 : 0;
  return Math.min(99, Math.max(75, base - sizePenalty + mevBonus));
}

function generateOrderId(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
}

const ORDERS = new Map<string, any>();

export async function executionRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.post("/simulate", async (request, reply) => {
    const data = simulateSchema.parse(request.body);
    const cost = estimateCost(data);
    const fragments = estimateFragments(data.amount, data.fragmentationMode);
    const confidence = estimateConfidence(data.amount, data.mevGuard);
    const etaBase = data.sourceChain === data.destinationChain ? 2 : 8;
    const etaVar = Math.random() * 5;

    const result = {
      id: uuid(),
      gas: parseFloat(cost.gas.toFixed(6)),
      bridgeFee: parseFloat(cost.bridgeFee.toFixed(4)),
      slippage: parseFloat(cost.slippage.toFixed(4)),
      eta: `${(etaBase + etaVar).toFixed(1)}s`,
      confidence: parseFloat(confidence.toFixed(1)),
      fragments,
      route: `${data.sourceAsset} → ${data.destinationAsset} via ${data.bridgePreference}`,
      fee: parseFloat(cost.fee.toFixed(4)),
      total: parseFloat(cost.total.toFixed(4)),
    };

    if (opts.redis) {
      await opts.redis.setex(`simulate:${result.id}`, 300, JSON.stringify(result));
    }
    return result;
  });

  app.post("/optimize", async (request, reply) => {
    const data = simulateSchema.parse(request.body);

    const bridges = ["LayerZero", "Across", "Stargate", "Hop", "CCTP"];
    const selectedBridges = bridges.slice(0, Math.floor(Math.random() * 3) + 1);
    const confidence = estimateConfidence(data.amount, data.mevGuard);
    const gas = CHAIN_GAS_MAP[data.sourceChain] || 1;

    const result = {
      id: uuid(),
      optimizedRoute: `${data.sourceChain} → ${selectedBridges[0]} → ${data.destinationChain}`,
      gas: `${(gas * (0.8 + Math.random() * 0.4)).toFixed(2)} gwei`,
      savings: `${(Math.random() * 25 + 5).toFixed(1)}%`,
      confidence: Math.min(99, confidence + 2),
      bridges: selectedBridges,
      fragments: estimateFragments(data.amount, data.fragmentationMode),
      privacyScore: data.privacyMode ? Math.floor(Math.random() * 20 + 75) : Math.floor(Math.random() * 20 + 50),
    };

    if (opts.redis) {
      await opts.redis.setex(`optimize:${result.id}`, 300, JSON.stringify(result));
    }
    return result;
  });

  app.post("/execute", async (request, reply) => {
    const data = simulateSchema.parse(request.body);

    const order = {
      id: uuid(),
      ...data,
      status: "executing",
      txHash: generateOrderId(),
      timestamp: Date.now(),
    };

    ORDERS.set(order.id, order);
    if (opts.redis) {
      await opts.redis.setex(`execution:${order.id}`, 3600, JSON.stringify(order));
    }

    setTimeout(async () => {
      order.status = "completed";
      ORDERS.set(order.id, order);
      if (opts.redis) {
        await opts.redis.setex(`execution:${order.id}`, 3600, JSON.stringify(order));
      }
    }, 5000);

    return order;
  });

  app.get("/orders", async (request, reply) => {
    const orders: any[] = [];
    if (opts.redis) {
      try {
        let cursor = "0";
        do {
          const [nextCursor, keys] = await opts.redis.scan(cursor, "MATCH", "execution:*", "COUNT", 100);
          cursor = nextCursor;
          for (const key of keys) {
            const data = await opts.redis.get(key);
            if (data) orders.push(JSON.parse(data));
          }
        } while (cursor !== "0");
      } catch { /* fallback to in-memory */ }
    }
    if (!orders.length) {
      ORDERS.forEach((o) => orders.push(o));
    }
    return orders.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  });

  app.get("/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (opts.redis) {
      const data = await opts.redis.get(`execution:${id}`);
      if (data) return JSON.parse(data);
    }
    const order = ORDERS.get(id);
    if (!order) {
      return reply.status(404).send({ error: { code: "ORDER_NOT_FOUND", message: "Order not found" } });
    }
    return order;
  });
}
