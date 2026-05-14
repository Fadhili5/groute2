import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { publish } from "../websocket/handler.js";

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

    const orderId = uuid();
    const txHash = generateOrderId();
    const fragments = estimateFragments(data.amount, data.fragmentationMode);

    const order = {
      id: orderId,
      ...data,
      status: "executing",
      txHash,
      fragments,
      progress: 0,
      stage: "submitting",
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
        data: { id: orderId, stage, status, progress, txHash, ...extra },
      });
    };

    await saveOrder(order);
    emitStatus("submitting", "executing", 0);

    // Real-time multi-stage execution simulation
    const stages = [
      { delay: 800, stage: "validating", status: "executing", progress: 10, label: "Validating route parameters" },
      { delay: 1200, stage: "quoting", status: "executing", progress: 25, label: "Fetching quotes from DEX aggregators" },
      { delay: 1000, stage: "splitting", status: "executing", progress: 40, label: `Splitting order into ${fragments} fragments` },
      { delay: 1500, stage: "bridging", status: "executing", progress: 60, label: `Bridging via ${data.bridgePreference}` },
      { delay: 1000, stage: "swapping", status: "executing", progress: 80, label: "Executing DEX swaps" },
      { delay: 1000, stage: "settling", status: "executing", progress: 90, label: "Submitting settlement proof" },
      { delay: 800, stage: "complete", status: "completed", progress: 100, label: "Order settled successfully" },
    ];

    let totalDelay = 0;
    for (const s of stages) {
      totalDelay += s.delay;
      const stageConfig = s;
      setTimeout(async () => {
        order.status = stageConfig.status;
        order.stage = stageConfig.stage;
        order.progress = stageConfig.progress;
        emitStatus(stageConfig.stage, stageConfig.status, stageConfig.progress, { label: stageConfig.label });

        if (stageConfig.status === "completed") {
          order.status = "completed";
          await saveOrder(order);
        } else {
          await saveOrder(order);
        }
      }, totalDelay);
    }

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
