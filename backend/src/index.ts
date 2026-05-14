import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { marketRoutes } from "./routes/market.js";
import { executionRoutes } from "./routes/execution.js";
import { settlementRoutes } from "./routes/settlement.js";
import { routeRoutes } from "./routes/routes.js";
import { alertRoutes } from "./routes/alerts.js";
import { solverRoutes } from "./routes/solver.js";
import { websocketHandler, setRedisClient } from "./websocket/handler.js";
import { errorHandler } from "./middleware/error.js";

let prisma: any = null;
if (process.env.DATABASE_URL) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();
    await prisma.$connect();
  } catch {
    console.warn("Prisma unavailable — running without database. All routes will return fallback data.");
    prisma = null;
  }
} else {
  console.warn("DATABASE_URL not set — running without database. All routes will return fallback data.");
}

let redis: any = null;
let redisSub: any = null;
try {
  redis = new Redis(config.redis.url);
  redis.on("error", (err: Error) => console.error("[Redis]", err.message));
} catch {
  console.warn("Redis unavailable — running without cache.");
}

// Separate connection for Redis Pub/Sub (can't share with commands)
if (config.redis.url) {
  try {
    redisSub = new Redis(config.redis.url);
    redisSub.on("error", (err: Error) => console.error("[Redis Sub]", err.message));
  } catch { /* sub client optional */ }
}

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  },
});

await app.register(cors, { origin: true });
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
await app.register(websocket);

app.setErrorHandler(errorHandler);

app.register(marketRoutes, { prefix: "/api/market", prisma, redis });
app.register(executionRoutes, { prefix: "/api/execution", prisma, redis });
app.register(settlementRoutes, { prefix: "/api/settlement", prisma, redis });
app.register(routeRoutes, { prefix: "/api/routes", prisma, redis });
app.register(alertRoutes, { prefix: "/api/alerts", prisma, redis });
app.register(solverRoutes, { prefix: "/api/solver", prisma, redis });

setRedisClient(redisSub);

app.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, websocketHandler);
});

app.get("/api/health", async () => ({
  status: "healthy",
  timestamp: Date.now(),
  uptime: process.uptime(),
}));

app.get("/api/kpi", async () => {
  if (!prisma) {
    return { tvl: 847_000_000, volume24h: 234_000_000, routesExecuted: 1847, mevProtected: 98.5 };
  }
  const [chains, routeCount] = await Promise.all([
    (prisma as any).chain.findMany({ select: { liquidity: true } }),
    (prisma as any).route.count(),
  ]);
  const tvl = chains.reduce((sum: number, c: any) => sum + c.liquidity, 0);
  return {
    tvl,
    volume24h: Math.round(tvl * 0.278),
    routesExecuted: routeCount,
    mevProtected: 98.5,
  };
});

app.get("/api/chains", async () => {
  if (!prisma) {
    return [
      { id: "ethereum", name: "Ethereum", shortName: "ETH", chainId: 1, rpcUrl: null, status: "healthy", liquidityPools: [] },
      { id: "arbitrum", name: "Arbitrum", shortName: "ARB", chainId: 42161, rpcUrl: null, status: "healthy", liquidityPools: [] },
      { id: "base", name: "Base", shortName: "BASE", chainId: 8453, rpcUrl: null, status: "healthy", liquidityPools: [] },
      { id: "solana", name: "Solana", shortName: "SOL", chainId: 101, rpcUrl: null, status: "healthy", liquidityPools: [] },
      { id: "avalanche", name: "Avalanche", shortName: "AVAX", chainId: 43114, rpcUrl: null, status: "degraded", liquidityPools: [] },
      { id: "bnb", name: "BNB Chain", shortName: "BNB", chainId: 56, rpcUrl: null, status: "healthy", liquidityPools: [] },
    ];
  }
  const chains = await prisma.chain.findMany({
    include: { liquidityPools: true },
  });
  return chains;
});

app.get("/api/system/health", async () => {
  const dbOk = prisma !== null;
  const redisOk = redis !== null;
  let blockHeight = 19876543;
  try {
    if (redisOk) {
      const cached = await redis.get("system:blockHeight");
      if (cached) blockHeight = parseInt(cached, 10);
    }
  } catch { /* use default */ }
  return {
    network: dbOk ? "connected" : "degraded",
    relayers: 12,
    blockHeight,
    apiHealth: dbOk && redisOk ? "healthy" : "degraded",
  };
});

const start = async () => {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`GhostRoute API running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export { app, prisma, redis };
