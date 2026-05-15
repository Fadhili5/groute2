import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis | null;
}

const createAlertSchema = z.object({
  type: z.enum(["bridge_outage", "route_success", "mev_event", "liquidity_spike", "relayer_failure", "gas_spike"]),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().min(1).max(500),
  chainId: z.string().optional(),
});

export async function alertRoutes(app: FastifyInstance, opts: RouteOptions) {
  app.get("/", async () => {
    const alerts = await opts.prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      alerts: alerts.map((a) => ({ ...a, timestamp: a.createdAt.getTime() })),
    };
  });

  app.get("/unread", async () => {
    const alerts = await opts.prisma.alert.findMany({
      where: { read: false },
      orderBy: { createdAt: "desc" },
    });
    return {
      unread: alerts.length,
      alerts: alerts.map((a) => ({ ...a, timestamp: a.createdAt.getTime() })),
    };
  });

  app.put("/:id/read", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await opts.prisma.alert.update({ where: { id }, data: { read: true } });
      return { success: true };
    } catch {
      return reply.status(404).send({ error: { code: "ALERT_NOT_FOUND", message: "Alert not found" } });
    }
  });

  app.post("/", async (request, reply) => {
    const data = createAlertSchema.parse(request.body);
    const alert = await opts.prisma.alert.create({
      data: { type: data.type, severity: data.severity, message: data.message, chainId: data.chainId },
    });
    return { ...alert, timestamp: alert.createdAt.getTime() };
  });
}
