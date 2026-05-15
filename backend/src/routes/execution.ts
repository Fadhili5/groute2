import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { publish } from "../websocket/handler.js";
import { AppError } from "../middleware/error.js";
import { getGasPrice } from "../services/rpc-provider.js";
import { getTokenPrice } from "../services/price-feed.js";

interface RouteOptions {
  prisma: PrismaClient;
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

const CHAIN_KEY_MAP: Record<string, string> = {
  ethereum: "ethereum",
  arbitrum: "arbitrum",
  base: "base",
  solana: "solana",
  avalanche: "avalanche",
  bnb: "bnb",
  "bnb chain": "bnb",
};

const NATIVE_SYMBOL: Record<string, string> = {
  ethereum: "ETH",
  arbitrum: "ETH",
  base: "ETH",
  solana: "SOL",
  avalanche: "AVAX",
  bnb: "BNB",
};

function estimateCost(data: z.infer<typeof simulateSchema>, gasUsd: number, bridgeFeeRate: number) {
  const gasCost = gasUsd;
  const bridgeFee = data.amount * bridgeFeeRate;
  const slippageVal = data.amount * (data.slippageTolerance / 100) * 0.0005;
  const totalFee = data.amount * 0.001;
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

function estimateConfidence(amount: number, mevGuard: boolean, routeSuccessRate: number): number {
  const base = 94;
  const sizePenalty = Math.min(amount / 10_000_000, 0.15) * 100;
  const mevBonus = mevGuard ? 3 : 0;
  return Math.min(99, Math.max(70, (base - sizePenalty + mevBonus + routeSuccessRate * 0.05)));
}

const ORDERS = new Map<string, any>();

async function getLiveGasUsd(chainInput: string): Promise<number> {
  const key = CHAIN_KEY_MAP[chainInput.toLowerCase()] ?? chainInput.toLowerCase();
  const gasPrice = await getGasPrice(key);
  const symbol = NATIVE_SYMBOL[key] ?? "ETH";
  const nativePrice = await getTokenPrice(symbol);
  if (gasPrice === null || nativePrice === null) {
    throw new AppError(503, "LIVE_GAS_UNAVAILABLE", `Unable to fetch live gas for chain ${chainInput}`);
  }

  const gasGwei = Number(gasPrice) / 1e9;
  const estimatedGasUnits = 210000;
  const gasNative = (gasGwei * estimatedGasUnits) / 1e9;
  return gasNative * nativePrice;
}

export async function executionRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.post("/simulate", async (request, reply) => {
    const data = simulateSchema.parse(request.body);
    const sourceChain = await opts.prisma.chain.findFirst({
      where: { OR: [{ name: data.sourceChain }, { shortName: data.sourceChain.toUpperCase() }] },
    });
    if (!sourceChain) {
      throw new AppError(404, "CHAIN_NOT_FOUND", `Source chain ${data.sourceChain} not found`);
    }

    const route = await opts.prisma.route.findFirst({
      where: {
        sourceChain: { name: data.sourceChain },
        destChain: { name: data.destinationChain },
        status: "active",
      },
      orderBy: [{ successRate: "desc" }, { avgLatency: "asc" }],
    });
    if (!route) {
      throw new AppError(404, "ROUTE_NOT_AVAILABLE", `No active route from ${data.sourceChain} to ${data.destinationChain}`);
    }

    const gasUsd = await getLiveGasUsd(data.sourceChain);
    const cost = estimateCost(data, gasUsd, sourceChain.bridgeFee || 0.0005);
    const fragments = estimateFragments(data.amount, data.fragmentationMode);
    const confidence = estimateConfidence(data.amount, data.mevGuard, route.successRate);
    const etaSeconds = Math.max(1, Math.round(route.avgLatency));

    const result = {
      id: uuid(),
      gas: parseFloat(cost.gas.toFixed(6)),
      bridgeFee: parseFloat(cost.bridgeFee.toFixed(4)),
      slippage: parseFloat(cost.slippage.toFixed(4)),
      eta: `${etaSeconds}s`,
      confidence: parseFloat(confidence.toFixed(1)),
      fragments,
      route: `${data.sourceAsset} → ${data.destinationAsset} via ${route.name}`,
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

    const routes = await opts.prisma.route.findMany({
      where: {
        sourceChain: { name: data.sourceChain },
        destChain: { name: data.destinationChain },
        status: "active",
      },
      orderBy: [{ successRate: "desc" }, { avgLatency: "asc" }],
      take: 3,
      include: { sourceChain: true, destChain: true },
    });

    if (!routes.length) {
      throw new AppError(404, "ROUTE_NOT_AVAILABLE", `No active routes from ${data.sourceChain} to ${data.destinationChain}`);
    }

    const best = routes[0];
    const gasUsd = await getLiveGasUsd(data.sourceChain);
    const confidence = estimateConfidence(data.amount, data.mevGuard, best.successRate);
    const savings = Math.max(0, ((routes[routes.length - 1].avgLatency - best.avgLatency) / Math.max(routes[routes.length - 1].avgLatency, 1)) * 100);

    const result = {
      id: uuid(),
      optimizedRoute: `${best.sourceChain.name} → ${best.name} → ${best.destChain.name}`,
      gas: `$${gasUsd.toFixed(2)}`,
      savings: `${savings.toFixed(1)}%`,
      confidence: Math.min(99, confidence + 2),
      bridges: routes.map((r) => r.name),
      fragments: estimateFragments(data.amount, data.fragmentationMode),
      privacyScore: data.privacyMode ? 88 : 62,
    };

    if (opts.redis) {
      await opts.redis.setex(`optimize:${result.id}`, 300, JSON.stringify(result));
    }
    return result;
  });

  app.post("/execute", async (request, reply) => {
    const data = simulateSchema.parse(request.body);

    const orderId = uuid();
    const fragments = estimateFragments(data.amount, data.fragmentationMode);

    const order: any = {
      id: orderId,
      ...data,
      status: "executing",
      txHash: null,
      fragments,
      progress: 5,
      stage: "validating",
      timestamp: Date.now(),
    };

    const saveOrder = async (updated: any) => {
      ORDERS.set(updated.id, updated);
      if (opts.redis) {
        await opts.redis.setex(`execution:${updated.id}`, 3600, JSON.stringify(updated));
      }
    };

    const emitStatus = (stage: string, status: string, progress: number, extra: Record<string, unknown> = {}) => {
      publish("execution", {
        type: "execution_update",
        channel: "execution",
        data: { id: orderId, stage, status, progress, ...extra },
      });
    };

    await saveOrder(order);
    emitStatus("validating", "executing", 5);

    const source = await opts.prisma.chain.findFirst({ where: { OR: [{ name: data.sourceChain }, { shortName: data.sourceChain.toUpperCase() }] } });
    const destination = await opts.prisma.chain.findFirst({ where: { OR: [{ name: data.destinationChain }, { shortName: data.destinationChain.toUpperCase() }] } });
    if (!source || !destination) {
      order.status = "failed";
      order.stage = "validation_failed";
      order.progress = 100;
      await saveOrder(order);
      emitStatus("validation_failed", "failed", 100, { label: "Chain validation failed" });
      return order;
    }

    emitStatus("quoting", "executing", 30, { label: "Fetching live route quotes" });
    const route = await opts.prisma.route.findFirst({
      where: { sourceChainId: source.id, destChainId: destination.id, status: "active" },
      orderBy: [{ successRate: "desc" }, { avgLatency: "asc" }],
    });
    if (!route) {
      order.status = "failed";
      order.stage = "routing_failed";
      order.progress = 100;
      await saveOrder(order);
      emitStatus("routing_failed", "failed", 100, { label: "No active route available" });
      return order;
    }

    emitStatus("routing", "executing", 70, { label: "Routing execution to relayer" });
    order.stage = "queued";
    order.progress = 85;
    order.routeId = route.id;
    await saveOrder(order);
    emitStatus("queued", "executing", 85, { label: "Queued for relayer submission", routeId: route.id });

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
