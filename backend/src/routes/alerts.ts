import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";

interface RouteOptions {
  prisma: PrismaClient;
  redis: Redis;
}

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
    const body = request.body as { type: string; severity: string; message: string; chainId?: string };
    const alert = await opts.prisma.alert.create({
      data: { type: body.type, severity: body.severity, message: body.message, chainId: body.chainId },
    });
    return { ...alert, timestamp: alert.createdAt.getTime() };
  });
}
