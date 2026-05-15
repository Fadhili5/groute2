import { FastifyRequest } from "fastify";
import { WebSocket } from "ws";
import { Redis } from "ioredis";
import { randomUUID } from "crypto";

interface Client {
  ws: WebSocket;
  subscriptions: Set<string>;
}

const clients = new Map<string, Client>();
let redisSub: Redis | null = null;

export function setRedisClient(redis: Redis | null) {
  redisSub = redis;
  if (redisSub) {
    redisSub.subscribe("ws:events", (err) => {
      if (err) console.error("[WS] Redis subscribe failed:", err.message);
    });
    redisSub.on("message", (_channel, message) => {
      try {
        const event = JSON.parse(message);
        broadcast(event.channel || "all", event);
      } catch { /* ignore bad messages */ }
    });
  }
}

export function publish(channel: string, event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (client.subscriptions.has(channel) || client.subscriptions.size === 0) {
        client.ws.send(payload);
      }
    }
  });
}

function broadcast(channel: string, event: any) {
  publish(channel, event);
}

export function websocketHandler(socket: WebSocket, request: FastifyRequest) {
  const clientId = `client_${randomUUID()}`;

  const client: Client = {
    ws: socket,
    subscriptions: new Set(),
  };

  clients.set(clientId, client);

  socket.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case "subscribe":
          if (msg.channel) {
            client.subscriptions.add(msg.channel);
            socket.send(JSON.stringify({ type: "subscribed", channel: msg.channel }));
          }
          break;

        case "unsubscribe":
          if (msg.channel) {
            client.subscriptions.delete(msg.channel);
          }
          break;

        case "ping":
          socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          break;

        default:
          socket.send(JSON.stringify({ type: "error", message: `Unknown message type: ${msg.type}` }));
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    }
  });

  socket.on("close", () => {
    clients.delete(clientId);
  });

  socket.on("error", () => {
    clients.delete(clientId);
  });

  socket.send(JSON.stringify({
    type: "connected",
    clientId,
    timestamp: Date.now(),
    channels: ["market", "execution", "settlement", "alerts", "solver"],
  }));
}
