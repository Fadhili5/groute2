import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis;
}

export async function routeRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.get("/", async () => {
    return {
      routes: [
        { id: "r1", name: "ETH-USDC Arbitrum Express", sourceChain: "Ethereum", destChain: "Arbitrum", avgLatency: 8.4, successRate: 99.2, totalVolume: 142000000, status: "active" },
        { id: "r2", name: "USDT Base Solana", sourceChain: "Base", destChain: "Solana", avgLatency: 6.2, successRate: 97.8, totalVolume: 89000000, status: "active" },
        { id: "r3", name: "BTC Avalanche Bridge", sourceChain: "Ethereum", destChain: "Avalanche", avgLatency: 14.1, successRate: 95.4, totalVolume: 45000000, status: "active" },
        { id: "r4", name: "AVAX BNB Express", sourceChain: "Avalanche", destChain: "BNB Chain", avgLatency: 11.3, successRate: 93.1, totalVolume: 28000000, status: "degraded" },
      ],
    };
  });

  app.get("/recommend", async () => {
    return {
      recommended: {
        path: "ETH \u2192 LayerZero \u2192 Arbitrum \u2192 Uniswap V3 \u2192 USDC",
        reason: "Optimal gas + liquidity combination. LayerZero shows 99.8% uptime with 2.1s finality. Arbitrum DEX pools have $456M depth with minimal slippage.",
        confidence: 94,
        bridgeHealth: "99.8% uptime",
        mevForecast: "Low risk - Flashbots + privacy RPC",
        alternatives: [
          "ETH \u2192 Across \u2192 Base \u2192 Aerodrome \u2192 USDC (3.2s, $0.08 gas)",
          "ETH \u2192 CCTP \u2192 Avalanche \u2192 Trader Joe \u2192 USDC (4.1s, $0.15 gas)",
        ],
      },
    };
  });

  app.get("/simulate", async () => {
    return {
      id: `sim-${Date.now()}`,
      status: "completed",
      fragments: [
        { type: "wallet", label: "Source wallet", duration: "0.2s", cost: "$0.00" },
        { type: "split", label: "3 fragments", duration: "0.5s", cost: "$0.01" },
        { type: "bridge", label: "LayerZero \u2192 Arbitrum", duration: "2.1s", cost: "$0.05" },
        { type: "swap", label: "Uniswap V3: USDC \u2192 ETH", duration: "1.8s", cost: "$0.03" },
        { type: "settle", label: "Settlement verification", duration: "0.5s", cost: "$0.01" },
      ],
      totalDuration: "5.1s",
      totalCost: "$0.10",
      confidence: 94.2,
    };
  });

  app.post("/compare", async (request) => {
    const body = request.body as { asset?: string; chain1?: string; chain2?: string };
    return {
      comparison: [
        { chain: body.chain1 || "Ethereum", liquidity: "$842M", spread: "0.02%", gas: "12.4 gwei", latency: "12s", score: 92 },
        { chain: body.chain2 || "Arbitrum", liquidity: "$456M", spread: "0.03%", gas: "0.08 gwei", latency: "3s", score: 88 },
      ],
      recommendation: body.chain2 || "Arbitrum",
      reason: "Lower gas costs and faster finality outweigh slightly lower liquidity depth.",
    };
  });
}
