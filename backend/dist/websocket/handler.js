import { WebSocket } from "ws";
const clients = new Map();
let redisSub = null;
export function setRedisClient(redis) {
    redisSub = redis;
    if (redisSub) {
        redisSub.subscribe("ws:events", (err) => {
            if (err)
                console.error("[WS] Redis subscribe failed:", err.message);
        });
        redisSub.on("message", (_channel, message) => {
            try {
                const event = JSON.parse(message);
                broadcast(event.channel || "all", event);
            }
            catch { /* ignore bad messages */ }
        });
    }
}
export function publish(channel, event) {
    const payload = JSON.stringify(event);
    clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            if (client.subscriptions.has(channel) || client.subscriptions.size === 0) {
                client.ws.send(payload);
            }
        }
    });
}
function broadcast(channel, event) {
    publish(channel, event);
}
export function websocketHandler(socket, request) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const client = {
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
        }
        catch {
            socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        }
    });
    socket.on("close", () => {
        clients.delete(clientId);
        clearInterval(interval);
    });
    socket.on("error", () => {
        clients.delete(clientId);
        clearInterval(interval);
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
}
function generateEvent() {
    const channels = ["market", "execution", "settlement", "alerts"];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const events = {
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
                id: `ws-${Date.now()}`,
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
//# sourceMappingURL=handler.js.map