import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
interface RouteOptions {
    prisma: PrismaClient | null;
    redis: Redis | null;
}
export declare function alertRoutes(app: FastifyInstance, opts: RouteOptions): Promise<void>;
export {};
//# sourceMappingURL=alerts.d.ts.map