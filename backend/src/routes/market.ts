import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis;
}

const CHAINS = [
  { id: "ethereum", name: "Ethereum", shortName: "ETH", chainId: 1, liquidity: 842_000_000, spread: 0.02, gas: 12.4, bridgeFee: 0.05, slippage: 0.01, latency: 12, privacy: 85, mev: 92, eta: "12s", status: "healthy" },
  { id: "arbitrum", name: "Arbitrum", shortName: "ARB", chainId: 42161, liquidity: 456_000_000, spread: 0.03, gas: 0.08, bridgeFee: 0.03, slippage: 0.02, latency: 3, privacy: 78, mev: 85, eta: "8s", status: "healthy" },
  { id: "base", name: "Base", shortName: "BASE", chainId: 8453, liquidity: 234_000_000, spread: 0.04, gas: 0.06, bridgeFee: 0.04, slippage: 0.03, latency: 2, privacy: 72, mev: 80, eta: "6s", status: "healthy" },
  { id: "solana", name: "Solana", shortName: "SOL", chainId: 101, liquidity: 678_000_000, spread: 0.01, gas: 0.0002, bridgeFee: 0.02, slippage: 0.01, latency: 1, privacy: 45, mev: 60, eta: "4s", status: "healthy" },
  { id: "avalanche", name: "Avalanche", shortName: "AVAX", chainId: 43114, liquidity: 189_000_000, spread: 0.05, gas: 0.15, bridgeFee: 0.06, slippage: 0.04, latency: 5, privacy: 70, mev: 75, eta: "10s", status: "degraded" },
  { id: "bnb", name: "BNB Chain", shortName: "BNB", chainId: 56, liquidity: 312_000_000, spread: 0.03, gas: 0.04, bridgeFee: 0.04, slippage: 0.02, latency: 4, privacy: 55, mev: 65, eta: "7s", status: "healthy" },
];

export async function marketRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.get("/chains", async (request, reply) => {
    return { chains: CHAINS };
  });

  app.get("/chains/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const chain = CHAINS.find((c) => c.id === id);
    if (!chain) {
      return reply.status(404).send({ error: { code: "CHAIN_NOT_FOUND", message: `Chain ${id} not found` } });
    }
    return chain;
  });

  app.get("/liquidity", async (request, reply) => {
    const pools = [
      { chain: "ETH", token: "USDC", depth: 320, apy: 4.2, volume24h: 456 },
      { chain: "ETH", token: "USDT", depth: 280, apy: 3.8, volume24h: 389 },
      { chain: "ETH", token: "ETH", depth: 420, apy: 2.1, volume24h: 234 },
      { chain: "ARB", token: "USDC", depth: 220, apy: 5.8, volume24h: 312 },
      { chain: "ARB", token: "USDT", depth: 180, apy: 5.2, volume24h: 267 },
      { chain: "ARB", token: "ETH", depth: 310, apy: 3.4, volume24h: 189 },
      { chain: "SOL", token: "USDC", depth: 410, apy: 6.9, volume24h: 534 },
      { chain: "SOL", token: "SOL", depth: 380, apy: 5.4, volume24h: 423 },
    ];
    return { pools };
  });

  app.get("/ticker", async () => {
    const items = [
      { type: "chain", message: "ETH: block 19876543 | gas 12.4 gwei", severity: "info" },
      { type: "chain", message: "ARB: block 187654321 | gas 0.08 gwei", severity: "info" },
      { type: "route", message: "Route 0x7f3c completed: 50000 USDC ARB \u2192 ETH (12.4s)", severity: "info" },
      { type: "alert", message: "MEV protection engaged on Ethereum mempool", severity: "warning" },
      { type: "bridge", message: "LayerZero: 3 active relays | 0 pending", severity: "info" },
      { type: "gas", message: "Base gas spike: 3.2 gwei (+240%)", severity: "warning" },
    ];
    return { items };
  });
}
