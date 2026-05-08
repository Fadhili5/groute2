import { FastifyRequest } from "fastify";
import { WebSocket } from "ws";

interface Client {
  ws: WebSocket;
  subscriptions: Set<string>;
}

const clients = new Map<string, Client>();

export function websocketHandler(socket: WebSocket, request: FastifyRequest) {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const client: Client = {
    ws: socket,
    subscriptions: new Set(),
  };

  clients.set(clientId, client);

  socket.on("message", (raw) => {
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

  socket.send(JSON.stringify({
    type: "connected",
    clientId,
    timestamp: Date.now(),
    channels: ["market", "execution", "settlement", "alerts"],
  }));

  const interval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      const events = generateEvent();
      if (client.subscriptions.has(events.channel) || client.subscriptions.size === 0) {
        socket.send(JSON.stringify(events));
      }
    }
  }, 3000);

  socket.on("close", () => clearInterval(interval));
}

function generateEvent() {
  const channels = ["market", "execution", "settlement", "alerts"];
  const channel = channels[Math.floor(Math.random() * channels.length)];

  const events: Record<string, () => any> = {
    market: () => ({
      type: "market_update",
      channel: "market",
      data: {
        chain: ["Ethereum", "Arbitrum", "Base", "Solana"][Math.floor(Math.random() * 4)],
        gas: (Math.random() * 50 + 0.1).toFixed(2),
        liquidity: Math.floor(Math.random() * 1000000),
        spread: (Math.random() * 0.1).toFixed(3),
      },
    }),
    execution: () => ({
      type: "execution_update",
      channel: "execution",
      data: {
        id: `0x${Math.random().toString(16).slice(2, 10)}`,
        status: ["simulating", "executing", "completed", "failed"][Math.floor(Math.random() * 4)],
        progress: Math.floor(Math.random() * 100),
      },
    }),
    settlement: () => ({
      type: "settlement_update",
      channel: "settlement",
      data: {
        txHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        state: ["pending", "confirmed", "finalized"][Math.floor(Math.random() * 3)],
        confirmations: Math.floor(Math.random() * 64),
      },
    }),
    alerts: () => ({
      type: "alert",
      channel: "alerts",
      data: {
        severity: ["info", "warning", "critical"][Math.floor(Math.random() * 3)],
        message: [
          "Route completed successfully",
          "Gas price spike detected",
          "New MEV activity on mempool",
          "Bridge relay delayed",
          "Liquidity depth increased",
        ][Math.floor(Math.random() * 5)],
        timestamp: Date.now(),
      },
    }),
  };

  return events[channel]();
}
