import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { marketRoutes } from "./routes/market.js";
import { executionRoutes } from "./routes/execution.js";
import { settlementRoutes } from "./routes/settlement.js";
import { routeRoutes } from "./routes/routes.js";
import { alertRoutes } from "./routes/alerts.js";
import { websocketHandler } from "./websocket/handler.js";
import { errorHandler } from "./middleware/error.js";

const prisma = new PrismaClient();
const redis = new Redis(config.redis.url);

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

app.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, websocketHandler);
});

app.get("/api/health", async () => ({
  status: "healthy",
  timestamp: Date.now(),
  uptime: process.uptime(),
}));

app.get("/api/kpi", async () => ({
  tvl: 847_000_000,
  volume24h: 234_000_000,
  routesExecuted: 1847,
  mevProtected: 98.5,
}));

app.get("/api/chains", async () => {
  const chains = await prisma.chain.findMany({
    include: { liquidityPools: true },
  });
  return chains;
});

app.get("/api/system/health", async () => ({
  network: "connected",
  relayers: 12,
  blockHeight: 19876543,
  apiHealth: "healthy",
}));

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
