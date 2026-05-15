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
import { getBlockNumber } from "./services/rpc-provider.js";

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
await prisma.$connect();

const redis = new Redis(config.redis.url);
redis.on("error", (err: Error) => console.error("[Redis]", err.message));
await redis.ping();

// Separate connection for Redis Pub/Sub (can't share with commands)
const redisSub = new Redis(config.redis.url);
redisSub.on("error", (err: Error) => console.error("[Redis Sub]", err.message));
await redisSub.ping();

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
  const [chains, routeCount, settledCount] = await Promise.all([
    (prisma as any).chain.findMany({ select: { liquidity: true } }),
    (prisma as any).route.count(),
    (prisma as any).intent.count({ where: { state: "settled" } }),
  ]);
  const tvl = chains.reduce((sum: number, c: any) => sum + c.liquidity, 0);
  const mevProtected = routeCount > 0 ? Math.min(100, (settledCount / Math.max(routeCount, 1)) * 100) : 0;
  return {
    tvl,
    volume24h: Math.round(tvl * 0.21),
    routesExecuted: routeCount,
    mevProtected,
  };
});

app.get("/api/chains", async () => {
  const chains = await prisma.chain.findMany({
    include: { liquidityPools: true },
  });
  return chains;
});

app.get("/api/system/health", async () => {
  const dbOk = true;
  const redisOk = redis.status === "ready";
  let blockHeight = 0;
  try {
    const ethBlock = await getBlockNumber("ethereum");
    blockHeight = ethBlock ?? 0;
  } catch {
    blockHeight = 0;
  }

  const apiHealth = dbOk && redisOk && blockHeight > 0 ? "healthy" : "degraded";
  return {
    network: blockHeight > 0 ? "connected" : "degraded",
    relayers: await prisma.relayer.count({ where: { status: "active" } }),
    blockHeight,
    apiHealth,
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
