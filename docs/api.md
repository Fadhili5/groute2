# API Reference

GhostRoute Terminal exposes API endpoints through a single Fastify backend server. All frontend requests to `/api/*` are proxied to the backend via Next.js rewrites (configured in `next.config.js`).

---

## Base URL

| Environment | URL |
|-------------|-----|
| Development (Frontend) | `http://localhost:3000/api` (proxied to `http://localhost:3001/api`) |
| Development (Backend) | `http://localhost:3001/api` |
| Production | `https://your-domain.com/api` |

---

## Common Response Format

### Success
```json
{
  "data": { ... }
}
```

### Error
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}  // optional
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request body/params |
| `VALIDATION_ERROR` | 400 | Zod schema validation failure |
| `PARSE_ERROR` | 400 | Invalid JSON |
| `NOT_FOUND` | 404 | Resource not found |
| `CHAIN_NOT_FOUND` | 404 | Chain ID doesn't exist |
| `ALERT_NOT_FOUND` | 404 | Alert ID not found |
| `ORDER_NOT_FOUND` | 404 | Order ID not found |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Market Endpoints

### GET /api/market/chains

Returns all supported chains with real-time metrics.

**Response:**
```json
{
  "chains": [
    {
      "id": "ethereum",
      "name": "Ethereum",
      "shortName": "ETH",
      "chainId": 1,
      "liquidity": 842000000,
      "spread": 0.02,
      "gas": 12.4,
      "bridgeFee": 0.05,
      "slippage": 0.01,
      "latency": 12,
      "privacy": 85,
      "mev": 92,
      "eta": "12s",
      "status": "healthy"
    },
    {
      "id": "arbitrum",
      "name": "Arbitrum",
      "shortName": "ARB",
      "chainId": 42161,
      "liquidity": 456000000,
      "spread": 0.03,
      "gas": 0.08,
      "bridgeFee": 0.03,
      "slippage": 0.02,
      "latency": 3,
      "privacy": 78,
      "mev": 85,
      "eta": "8s",
      "status": "healthy"
    }
  ]
}
```

**Supported Chains:**
| ID | Chain | Chain ID |
|----|-------|----------|
| ethereum | Ethereum | 1 |
| arbitrum | Arbitrum | 42161 |
| base | Base | 8453 |
| solana | Solana | 101 |
| avalanche | Avalanche | 43114 |
| bnb | BNB Chain | 56 |

### GET /api/market/chains/:id

Returns a single chain's data.

**Parameters:** `id` — Chain identifier (e.g., "ethereum")

**Response:** Single chain object (same schema as above)

**Error:** `404` with code `CHAIN_NOT_FOUND`

### GET /api/market/liquidity

Returns cross-chain liquidity pool data.

**Response:**
```json
{
  "pools": [
    { "chain": "ETH", "token": "USDC", "depth": 320, "apy": 4.2, "volume24h": 456 },
    { "chain": "ETH", "token": "USDT", "depth": 280, "apy": 3.8, "volume24h": 389 },
    { "chain": "SOL", "token": "USDC", "depth": 410, "apy": 6.9, "volume24h": 534 }
  ]
}
```

### GET /api/market/ticker

Returns live ticker feed items for the StatusStrip component.

**Response:**
```json
{
  "items": [
    { "type": "chain", "message": "ETH: block 19876543 | gas 12.4 gwei", "severity": "info" },
    { "type": "alert", "message": "MEV protection engaged", "severity": "warning" },
    { "type": "bridge", "message": "LayerZero: 3 active relays", "severity": "info" },
    { "type": "gas", "message": "Base gas spike: 3.2 gwei (+240%)", "severity": "warning" }
  ]
}
```

---

## Execution Endpoints

### POST /api/execution/simulate

Simulate a route execution before committing. Generates cost, time, and confidence estimates.

**Request Body:**
```json
{
  "sourceAsset": "USDC",
  "destinationAsset": "ETH",
  "sourceChain": "Arbitrum",
  "destinationChain": "Ethereum",
  "amount": 50000,
  "privacyMode": true,
  "fragmentationMode": true,
  "slippageTolerance": 0.5,
  "bridgePreference": "LayerZero",
  "mevGuard": true
}
```

**Zod Schema** (`simulateSchema`):
| Field | Type | Required |
|-------|------|----------|
| sourceAsset | string | yes |
| destinationAsset | string | yes |
| sourceChain | string | yes |
| destinationChain | string | yes |
| amount | number (positive) | yes |
| privacyMode | boolean | yes |
| fragmentationMode | boolean | yes |
| slippageTolerance | number (0-100) | yes |
| bridgePreference | string | yes |
| mevGuard | boolean | yes |

**Response:**
```json
{
  "id": "sim-1712345678901",
  "gas": 0.0042,
  "bridgeFee": 25.0,
  "slippage": 0.0005,
  "eta": "8.4s",
  "confidence": 94.2,
  "fragments": 3,
  "route": "USDC → ETH via LayerZero",
  "fee": 150.0
}
```

**Caching:** Results cached in Redis with key `simulate:{id}` for 300 seconds.

### POST /api/execution/optimize

Optimize route parameters — finds the most efficient path between chains.

**Request Body:** Same schema as `/simulate`

**Response:**
```json
{
  "id": "opt-1712345678901",
  "optimizedRoute": "Arbitrum → Arbitrum → Ethereum",
  "gas": "0.08 gwei",
  "savings": "12.5%",
  "confidence": 94,
  "bridges": ["LayerZero", "Across"],
  "fragments": 2,
  "privacyScore": 85
}
```

**Caching:** Redis key `optimize:{id}` for 300 seconds.

### POST /api/execution/execute

Execute a route order. Creates an order with `executing` status; transitions to `completed` after 5 seconds. The frontend polls `GET /api/execution/orders/:id` to detect completion.

**Request Body:** Same schema as `/simulate`

**Response:**
```json
{
  "id": "1712345678901-abc123def",
  "sourceAsset": "USDC",
  "destinationAsset": "ETH",
  "sourceChain": "Arbitrum",
  "destinationChain": "Ethereum",
  "amount": 50000,
  "privacyMode": true,
  "fragmentationMode": true,
  "slippageTolerance": 0.5,
  "bridgePreference": "LayerZero",
  "mevGuard": true,
  "status": "executing",
  "txHash": "0x7f3c8a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a...",
  "timestamp": 1712345678901
}
```

**Caching:** Redis key `execution:{id}` for 3600 seconds.
**Async:** Server-side `setTimeout` transitions `executing` -> `completed` after 5000ms.

### GET /api/execution/orders

List recent orders (up to 50, sorted by recency).

**Response:**
```json
{
  "orders": [
    {
      "id": "1712345678901-abc123def",
      "status": "completed",
      "sourceAsset": "USDC",
      "destinationAsset": "ETH",
      "amount": 50000,
      "timestamp": 1712345678901
    }
  ]
}
```

### GET /api/execution/orders/:id

Get a specific order by ID.

**Parameters:** `id` — Order ID

**Response:** Single order object (same schema as execute response)

**Error:** `404` with code `ORDER_NOT_FOUND`

---

## Settlement Endpoints

### GET /api/settlement/proofs

Returns recent settlement proofs.

**Response:**
```json
{
  "proofs": [
    {
      "txHash": "0x7f3c8a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "routeId": "0x9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "proofHash": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
      "state": "confirmed",
      "fees": 12.45,
      "relayer": "0x8f3c7a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
      "confirmations": 32,
      "timestamp": 1712345648901
    }
  ]
}
```

**Settlement States:** `pending` | `confirmed` | `failed` | `finalized`

### GET /api/settlement/verify/:txHash

Verify a transaction hash on-chain.

**Parameters:** `txHash` — Transaction hash to verify

**Response:**
```json
{
  "verified": true,
  "txHash": "0x7f3c8a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
  "block": 19876543,
  "confirmations": 32,
  "timestamp": 1712345648901,
  "state": "confirmed",
  "chainId": 1
}
```

### POST /api/settlement/inspect

Inspect a settlement by tx hash or route ID. Returns comprehensive settlement data.

**Request Body:**
```json
{
  "txHash": "0x7f3c8a2b...",
  "routeId": "r1"
}
```

At least one of `txHash` or `routeId` is required.

**Response:**
```json
{
  "txHash": "0x7f3c8a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
  "routeId": "r1",
  "proofHash": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
  "state": "confirmed",
  "fees": 12.45,
  "relayer": "0x8f3c7a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
  "confirmations": 32,
  "timestamp": 1712345678901
}
```

---

## Route Endpoints

### GET /api/routes

List all registered routes between chains.

**Response:**
```json
{
  "routes": [
    {
      "id": "r1",
      "name": "ETH-USDC Arbitrum Express",
      "sourceChain": "Ethereum",
      "destChain": "Arbitrum",
      "avgLatency": 8.4,
      "successRate": 99.2,
      "totalVolume": 142000000,
      "status": "active"
    }
  ]
}
```

**Route Statuses:** `active` | `degraded`

### GET /api/routes/recommend

Get AI-recommended route. Returns optimal path from the AI Solver (simulated 0G integration).

**Response:**
```json
{
  "recommended": {
    "path": "ETH → LayerZero → Arbitrum → Uniswap V3 → USDC",
    "reason": "Optimal gas + liquidity combination. LayerZero shows 99.8% uptime...",
    "confidence": 94,
    "bridgeHealth": "99.8% uptime",
    "mevForecast": "Low risk - Flashbots + privacy RPC",
    "alternatives": [
      "ETH → Across → Base → Aerodrome → USDC (3.2s, $0.08 gas)",
      "ETH → CCTP → Avalanche → Trader Joe → USDC (4.1s, $0.15 gas)"
    ]
  }
}
```

### GET /api/routes/simulate

Get route simulation with fragment breakdown. Returns the step-by-step visualization data.

**Response:**
```json
{
  "id": "sim-1712345678901",
  "status": "completed",
  "fragments": [
    { "type": "wallet", "label": "Source wallet", "duration": "0.2s", "cost": "$0.00" },
    { "type": "split", "label": "3 fragments", "duration": "0.5s", "cost": "$0.01" },
    { "type": "bridge", "label": "LayerZero → Arbitrum", "duration": "2.1s", "cost": "$0.05" },
    { "type": "swap", "label": "Uniswap V3: USDC → ETH", "duration": "1.8s", "cost": "$0.03" },
    { "type": "settle", "label": "Settlement verification", "duration": "0.5s", "cost": "$0.01" }
  ],
  "totalDuration": "5.1s",
  "totalCost": "$0.10",
  "confidence": 94.2
}
```

### POST /api/routes/compare

Compare two chains for a given asset.

**Request Body:**
```json
{
  "asset": "USDC",
  "chain1": "Ethereum",
  "chain2": "Arbitrum"
}
```

**Response:**
```json
{
  "comparison": [
    { "chain": "Ethereum", "liquidity": "$842M", "spread": "0.02%", "gas": "12.4 gwei", "latency": "12s", "score": 92 },
    { "chain": "Arbitrum", "liquidity": "$456M", "spread": "0.03%", "gas": "0.08 gwei", "latency": "3s", "score": 88 }
  ],
  "recommendation": "Arbitrum",
  "reason": "Lower gas costs and faster finality outweigh slightly lower liquidity depth."
}
```

---

## Alert Endpoints

### GET /api/alerts

Returns all system alerts (6 pre-generated).

**Response:**
```json
{
  "alerts": [
    {
      "id": "a1",
      "type": "route_success",
      "severity": "info",
      "message": "Route 0x7f3c: 50,000 USDC ARB → ETH completed in 12.4s",
      "timestamp": 1712345673901,
      "read": false,
      "chain": "arbitrum"
    }
  ]
}
```

**Alert Types:** `route_success` | `mev_event` | `bridge_outage` | `gas_spike` | `liquidity_spike` | `relayer_failure`

**Severity Levels:** `info` | `warning` | `critical`

### GET /api/alerts/unread

Returns unread alerts with count.

**Response:**
```json
{
  "unread": 3,
  "alerts": [
    {
      "id": "a1",
      "type": "route_success",
      "severity": "info",
      "message": "Route 0x7f3c completed",
      "timestamp": 1712345673901,
      "read": false
    }
  ]
}
```

### PUT /api/alerts/:id/read

Mark a specific alert as read. Also accepts POST.

**Parameters:** `id` — Alert ID (e.g., "a1")

**Response:**
```json
{
  "success": true,
  "id": "a1"
}
```

---

## System Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1712345678901,
  "uptime": 12345.6
}
```

### GET /api/kpi

Key performance indicators for the header bar.

**Response:**
```json
{
  "tvl": 847000000,
  "volume24h": 234000000,
  "routesExecuted": 1847,
  "mevProtected": 98.5
}
```

### GET /api/chains

Returns all chains from the PostgreSQL database (includes liquidity pools).

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Ethereum",
    "shortName": "ETH",
    "chainId": 1,
    "rpcUrl": null,
    "status": "healthy",
    "liquidityPools": [
      { "id": "uuid", "chainId": 1, "token": "USDC", "depth": 320, "utilization": 72, "apy": 4.2, "volume24h": 456, "fee": 0.05 }
    ]
  }
]
```

### GET /api/system/health

System health status for the sidebar display.

**Response:**
```json
{
  "network": "connected",
  "relayers": 12,
  "blockHeight": 19876543,
  "apiHealth": "healthy"
}
```

---

## WebSocket API

### Connection

```
ws://host:3001/ws
wss://host:3001/ws
```

### Message Format

All messages are JSON-encoded.

### Client → Server

**Subscribe to channel:**
```json
{ "type": "subscribe", "channel": "market" }
```

**Unsubscribe from channel:**
```json
{ "type": "unsubscribe", "channel": "market" }
```

**Ping:**
```json
{ "type": "ping" }
```

### Server → Client

**On connect:**
```json
{
  "type": "connected",
  "clientId": "client_1712345678901_abc123",
  "timestamp": 1712345678901,
  "channels": ["market", "execution", "settlement", "alerts"]
}
```

**Market update** (every 3s if subscribed):
```json
{
  "type": "market_update",
  "channel": "market",
  "data": {
    "chain": "Ethereum",
    "gas": "12.40",
    "liquidity": 842000,
    "spread": "0.020"
  }
}
```

**Execution update** (every 3s if subscribed):
```json
{
  "type": "execution_update",
  "channel": "execution",
  "data": {
    "id": "0x7f3c8a2b",
    "status": "simulating",
    "progress": 45
  }
}
```

**Settlement update** (every 3s if subscribed):
```json
{
  "type": "settlement_update",
  "channel": "settlement",
  "data": {
    "txHash": "0x7f3c8a2b...",
    "state": "pending",
    "confirmations": 12
  }
}
```

**Alert** (every 3s if subscribed):
```json
{
  "type": "alert",
  "channel": "alerts",
  "data": {
    "severity": "warning",
    "message": "Gas price spike detected",
    "timestamp": 1712345678901
  }
}
```

**Pong:**
```json
{ "type": "pong", "timestamp": 1712345678901 }
```

**Error:**
```json
{ "type": "error", "message": "Unknown message type: invalid_type" }
```

---

## API Route Map

| # | Method | Route | Description |
|---|--------|-------|-------------|
| 1 | GET | /api/market/chains | All chains with metrics |
| 2 | GET | /api/market/chains/:id | Single chain details |
| 3 | GET | /api/market/liquidity | Liquidity pool data |
| 4 | GET | /api/market/ticker | Live ticker feed |
| 5 | POST | /api/execution/simulate | Simulate route execution |
| 6 | POST | /api/execution/optimize | Optimize route params |
| 7 | POST | /api/execution/execute | Execute route order |
| 8 | GET | /api/execution/orders | List recent orders |
| 9 | GET | /api/execution/orders/:id | Get order by ID |
| 10 | GET | /api/settlement/proofs | Settlement proofs |
| 11 | GET | /api/settlement/verify/:txHash | On-chain verification |
| 12 | POST | /api/settlement/inspect | Inspect settlement |
| 13 | GET | /api/routes | Registered routes |
| 14 | GET | /api/routes/recommend | AI recommendation |
| 15 | GET | /api/routes/simulate | Route simulation |
| 16 | POST | /api/routes/compare | Compare two chains |
| 17 | GET | /api/alerts | All alerts |
| 18 | GET | /api/alerts/unread | Unread alert count |
| 19 | PUT | /api/alerts/:id/read | Mark alert read |
| 20 | POST | /api/alerts | Create alert |
| 21 | GET | /api/health | Health check |
| 22 | GET | /api/kpi | Key performance indicators |
| 23 | GET | /api/chains | Chains from DB (with pools) |
| 24 | GET | /api/system/health | System health status |
| — | WS | /ws | WebSocket connection |
