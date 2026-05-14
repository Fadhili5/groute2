import { FastifyRequest } from "fastify";
import { WebSocket } from "ws";
import { Redis } from "ioredis";
export declare function setRedisClient(redis: Redis | null): void;
export declare function publish(channel: string, event: Record<string, unknown>): void;
export declare function websocketHandler(socket: WebSocket, request: FastifyRequest): void;
//# sourceMappingURL=handler.d.ts.map