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

const createAuctionSchema = z.object({
  intentId: z.string().min(1),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.number().positive(),
  startPrice: z.number().positive(),
});

const submitBidSchema = z.object({
  auctionId: z.string().min(1),
  price: z.number().positive(),
  estimatedGas: z.number().positive(),
  executionTime: z.number().positive(),
  routeId: z.string().min(1),
});

interface Solver {
  id: string;
  address: string;
  name: string;
  stakedAmount: number;
  totalSolved: number;
  successRate: number;
  averageExecutionTime: number;
  isActive: boolean;
  registeredAt: number;
}

interface Auction {
  id: string;
  intentId: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  startPrice: number;
  currentPrice: number;
  endPrice: number;
  deadline: number;
  state: "Created" | "Bidding" | "Closed" | "Settled" | "Cancelled";
  winner: string | null;
  finalPrice: number | null;
  settledAt: number | null;
}

interface Bid {
  id: string;
  auctionId: string;
  solver: string;
  price: number;
  estimatedGas: number;
  executionTime: number;
  routeId: string;
  state: "Submitted" | "Accepted" | "Rejected" | "Expired";
  submittedAt: number;
}

const SOLVERS = new Map<string, Solver>();
const AUCTIONS = new Map<string, Auction>();
const BIDS = new Map<string, Bid[]>();

const DEMO_SOLVERS: Solver[] = [
  {
    id: "solver-1",
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f8E1a1",
    name: "Quantum Solver",
    stakedAmount: 150,
    totalSolved: 1247,
    successRate: 98.7,
    averageExecutionTime: 2.3,
    isActive: true,
    registeredAt: Date.now() - 86400000 * 30,
  },
  {
    id: "solver-2",
    address: "0x9B3a54D092fF4B4f7aF8C4f6E4D9a2C3b5e1f8A2",
    name: "Flash Relayer",
    stakedAmount: 85,
    totalSolved: 892,
    successRate: 97.2,
    averageExecutionTime: 1.8,
    isActive: true,
    registeredAt: Date.now() - 86400000 * 20,
  },
  {
    id: "solver-3",
    address: "0xA1b2C3d4E5F6789012345678901234567890AbCd",
    name: "Cortex Execute",
    stakedAmount: 220,
    totalSolved: 2156,
    successRate: 99.1,
    averageExecutionTime: 3.1,
    isActive: true,
    registeredAt: Date.now() - 86400000 * 45,
  },
  {
    id: "solver-4",
    address: "0xDeF4567890123456789012345678901234567890",
    name: "Nexus Flow",
    stakedAmount: 65,
    totalSolved: 423,
    successRate: 95.8,
    averageExecutionTime: 1.5,
    isActive: true,
    registeredAt: Date.now() - 86400000 * 10,
  },
];

DEMO_SOLVERS.forEach((s) => SOLVERS.set(s.id, s));

const DEMO_AUCTIONS: Auction[] = [
  {
    id: "auction-001",
    intentId: "0xabc123def456",
    tokenIn: "USDC",
    tokenOut: "ETH",
    amountIn: 75000,
    startPrice: 150,
    currentPrice: 145,
    endPrice: 120,
    deadline: Date.now() + 300000,
    state: "Bidding",
    winner: null,
    finalPrice: null,
    settledAt: null,
  },
  {
    id: "auction-002",
    intentId: "0x789xyz123abc",
    tokenIn: "WBTC",
    tokenOut: "SOL",
    amountIn: 500000,
    startPrice: 200,
    currentPrice: 185,
    endPrice: 160,
    deadline: Date.now() + 180000,
    state: "Bidding",
    winner: null,
    finalPrice: null,
    settledAt: null,
  },
  {
    id: "auction-003",
    intentId: "0xdef456789abc",
    tokenIn: "ETH",
    tokenOut: "ARB",
    amountIn: 25000,
    startPrice: 85,
    currentPrice: 82,
    endPrice: 68,
    deadline: Date.now() + 600000,
    state: "Bidding",
    winner: null,
    finalPrice: null,
    settledAt: null,
  },
];

const DEMO_BIDS: Bid[] = [
  { id: "bid-001", auctionId: "auction-001", solver: "0x742d35Cc6634C0532925a3b844Bc9e7595f8E1a1", price: 145, estimatedGas: 120000, executionTime: 2, routeId: "0xroute1", state: "Submitted", submittedAt: Date.now() - 60000 },
  { id: "bid-002", auctionId: "auction-001", solver: "0x9B3a54D092fF4B4f7aF8C4f6E4D9a2C3b5e1f8A2", price: 148, estimatedGas: 110000, executionTime: 3, routeId: "0xroute2", state: "Submitted", submittedAt: Date.now() - 45000 },
  { id: "bid-003", auctionId: "auction-002", solver: "0xA1b2C3d4E5F6789012345678901234567890AbCd", price: 185, estimatedGas: 150000, executionTime: 4, routeId: "0xroute3", state: "Submitted", submittedAt: Date.now() - 30000 },
  { id: "bid-004", auctionId: "auction-003", solver: "0xDeF4567890123456789012345678901234567890", price: 82, estimatedGas: 90000, executionTime: 1, routeId: "0xroute4", state: "Submitted", submittedAt: Date.now() - 15000 },
];

DEMO_AUCTIONS.forEach((a) => {
  AUCTIONS.set(a.id, a);
  BIDS.set(a.id, DEMO_BIDS.filter((b) => b.auctionId === a.id));
});

export async function solverRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.get("/solvers", async (request, reply) => {
    const solvers = Array.from(SOLVERS.values()).filter((s) => s.isActive);
    return {
      solvers,
      total: solvers.length,
      totalVolume: solvers.reduce((acc, s) => acc + s.stakedAmount * 1000, 0),
    };
  });

  app.get("/solvers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const solver = SOLVERS.get(id);
    if (!solver) {
      return reply.status(404).send({ error: { code: "SOLVER_NOT_FOUND", message: "Solver not found" } });
    }
    const solverAuctions = Array.from(AUCTIONS.values()).filter((a) => {
      const bids = BIDS.get(a.id) || [];
      return bids.some((b) => b.solver === solver.address);
    });
    return { ...solver, auctions: solverAuctions.length, bids: BIDS.size };
  });

  app.post("/auctions", async (request, reply) => {
    const data = createAuctionSchema.parse(request.body);

    const auction: Auction = {
      id: uuid(),
      intentId: data.intentId,
      tokenIn: data.tokenIn,
      tokenOut: data.tokenOut,
      amountIn: data.amountIn,
      startPrice: data.startPrice,
      currentPrice: data.startPrice,
      endPrice: Math.floor(data.startPrice * 0.8),
      deadline: Date.now() + 600000,
      state: "Bidding",
      winner: null,
      finalPrice: null,
      settledAt: null,
    };

    AUCTIONS.set(auction.id, auction);
    BIDS.set(auction.id, []);

    publish("solver", {
      type: "auction_created",
      channel: "solver",
      data: auction,
    });

    return auction;
  });

  app.get("/auctions", async (request, reply) => {
    const { state, limit } = request.query as { state?: string; limit?: string };
    let auctions = Array.from(AUCTIONS.values());

    if (state) {
      auctions = auctions.filter((a) => a.state === state);
    }

    return {
      auctions: auctions.sort((a, b) => b.deadline - a.deadline).slice(0, parseInt(limit || "50")),
      total: auctions.length,
      active: auctions.filter((a) => a.state === "Bidding").length,
    };
  });

  app.get("/auctions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const auction = AUCTIONS.get(id);
    if (!auction) {
      return reply.status(404).send({ error: { code: "AUCTION_NOT_FOUND", message: "Auction not found" } });
    }
    const bids = BIDS.get(id) || [];
    return { ...auction, bids };
  });

  app.post("/auctions/:id/bids", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = submitBidSchema.parse(request.body);

    const auction = AUCTIONS.get(id);
    if (!auction) {
      return reply.status(404).send({ error: { code: "AUCTION_NOT_FOUND", message: "Auction not found" } });
    }

    if (auction.state !== "Bidding") {
      return reply.status(400).send({ error: { code: "AUCTION_NOT_ACTIVE", message: "Auction is not accepting bids" } });
    }

    if (Date.now() > auction.deadline) {
      return reply.status(400).send({ error: { code: "AUCTION_ENDED", message: "Auction deadline passed" } });
    }

    const solvers = Array.from(SOLVERS.values());
    const randomSolver = solvers[Math.floor(Math.random() * solvers.length)];

    const bid: Bid = {
      id: uuid(),
      auctionId: id,
      solver: randomSolver.address,
      price: data.price,
      estimatedGas: data.estimatedGas,
      executionTime: data.executionTime,
      routeId: data.routeId,
      state: "Submitted",
      submittedAt: Date.now(),
    };

    const existingBids = BIDS.get(id) || [];
    existingBids.push(bid);
    BIDS.set(id, existingBids);

    if (data.price < auction.currentPrice) {
      auction.currentPrice = data.price;
    }

    publish("solver", {
      type: "bid_submitted",
      channel: "solver",
      data: { auctionId: id, bid },
    });

    return bid;
  });

  app.post("/auctions/:id/settle", async (request, reply) => {
    const { id } = request.params as { id: string };

    const auction = AUCTIONS.get(id);
    if (!auction) {
      return reply.status(404).send({ error: { code: "AUCTION_NOT_FOUND", message: "Auction not found" } });
    }

    if (auction.state !== "Bidding") {
      return reply.status(400).send({ error: { code: "AUCTION_NOT_ACTIVE", message: "Auction cannot be settled" } });
    }

    const bids = BIDS.get(id) || [];
    if (bids.length === 0) {
      auction.state = "Cancelled";
      return { ...auction, message: "Auction cancelled - no bids" };
    }

    const sortedBids = [...bids].sort((a, b) => a.price - b.price);
    const winningBid = sortedBids[0];

    auction.state = "Settled";
    auction.winner = winningBid.solver;
    auction.finalPrice = winningBid.price;
    auction.settledAt = Date.now();

    for (const bid of bids) {
      bid.state = bid.id === winningBid.id ? "Accepted" : "Rejected";
    }

    publish("solver", {
      type: "auction_settled",
      channel: "solver",
      data: { auction, winningBid },
    });

    return { ...auction, winningBid };
  });

  app.get("/leaderboard", async (request, reply) => {
    const solvers = Array.from(SOLVERS.values())
      .filter((s) => s.isActive)
      .sort((a, b) => b.totalSolved - a.totalSolved)
      .slice(0, 10)
      .map((s, i) => ({
        rank: i + 1,
        ...s,
      }));

    return { leaderboard: solvers, updatedAt: Date.now() };
  });

  app.get("/stats", async (request, reply) => {
    const totalAuctions = AUCTIONS.size;
    const activeAuctions = Array.from(AUCTIONS.values()).filter((a) => a.state === "Bidding").length;
    const settledAuctions = Array.from(AUCTIONS.values()).filter((a) => a.state === "Settled").length;
    const totalBids = Array.from(BIDS.values()).reduce((acc, bids) => acc + bids.length, 0);
    const avgPrice = (() => {
      const settled = Array.from(AUCTIONS.values()).filter((a) => a.finalPrice !== null);
      if (settled.length === 0) return 0;
      return settled.reduce((acc, a) => acc + (a.finalPrice || 0), 0) / settled.length;
    })();

    return {
      totalAuctions,
      activeAuctions,
      settledAuctions,
      totalBids,
      avgWinningPrice: avgPrice.toFixed(2),
    };
  });
}