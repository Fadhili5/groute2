# Architecture

## System Overview

GhostRoute Terminal is a three-tier cross-chain execution platform:

| Tier | Technology | Purpose |
|------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) + Zustand + AG Grid + Recharts + xterm.js | Institutional trading terminal UI |
| **Backend** | Fastify 4 + Prisma ORM + PostgreSQL + Redis + BullMQ + WebSockets + Services | API server, data persistence, real-time streaming |
| **Contracts** | Solidity 0.8.26 + OpenZeppelin v5 | On-chain intent routing, settlement, governance |

---

## Full Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     BROWSER (Next.js 14 SPA)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    TerminalShell Layout                    │   │
│  │  ┌────────┐ ┌─────────────────────────┐ ┌─────────────┐  │   │
│  │  │Sidebar │ │     Main Content Area   │ │ Right Panel │  │   │
│  │  │Nav: 8  │ │   Tab-switched modules  │ │ AI Solver   │  │   │
│  │  │items   │ │   MarketMatrix          │ │ Watchlist   │  │   │
│  │  │Health  │ │   RouteVisualizer       │ └─────────────┘  │   │
│  │  └────────┘ │   ExecutionBlotter      │                   │   │
│  │             │   LiquidityHeatmap      │                   │   │
│  │  ┌────────┐ │   SettlementInspector   │                   │   │
│  │  │ Header │ │   CommandTerminal       │                   │   │
│  │  │ KPI    │ │   AlertsFeed            │                   │   │
│  │  │ Search │ │   Watchlist             │                   │   │
│  │  └────────┘ └─────────────────────────┘                   │   │
│  │  ┌──────────────────────────────────────────────────┐     │   │
│  │  │              StatusStrip (ticker)                 │     │   │
│  │  └──────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Zustand State Management (6 stores)          │   │
│  │  market-store ── route-store ── alert-store ── solver    │   │
│  │  wallet-store ── ui-store                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         API Layer: Next.js rewrites → Fastify backend      │   │
│  │  All /api/* requests proxied to localhost:3001            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              WebSocket Client (useWebSocket hook)          │   │
│  │  Auto-connect · Exponential backoff reconnect            │   │
│  │  Handles: chain_update, market_update, alert, kpi_update │   │
│  │  Loads initial data from REST API on connect             │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │ HTTP/REST               │ WebSocket ws://host:3001/ws
              ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FASTIFY API SERVER (:3001)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Middleware Pipeline                     │   │
│  │  CORS (@fastify/cors)                                    │   │
│  │  Rate Limit (100 req/min per IP)                         │   │
│  │  @fastify/websocket                                      │   │
│  │  Error Handler (AppError · ZodError · SyntaxError)       │   │
│  │  Pino Logger (pretty-printed in dev)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Route Modules                           │   │
│  │                                                           │   │
│  │  /api/market/*  (market.ts)    — Chain data + liquidity   │   │
│  │  /api/execution/* (execution.ts) — Sim/Optimize/Execute  │   │
│  │  /api/settlement/* (settlement.ts) — Proofs/Verify       │   │
│  │  /api/routes/*   (routes.ts)   — Route discovery         │   │
│  │  /api/alerts/*   (alerts.ts)   — Alert CRUD              │   │
│  │  /api/health                    — Health check            │   │
│  │  /api/kpi                       — Key performance metrics │   │
│  │  /api/chains                    — Chains from DB          │   │
│  │  /api/system/health             — System health status    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              WebSocket Handler (/ws)                      │   │
│  │  Subscribe/unsubscribe channels                          │   │
│  │  Redis Pub/Sub integration for real events               │   │
│  │  Auto-generates events every 3s:                         │   │
│  │    market_update · execution_update                       │   │
│  │    settlement_update · alert                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐    │
│  │ PostgreSQL │  │   Redis    │  │     BullMQ Queues       │    │
│  │ (Prisma)   │  │ (ioredis)  │  │ (job processing)       │    │
│  │            │  │            │  │                        │    │
│  │Chain       │  │Cache:      │  │Simulation jobs         │    │
│  │Route       │  │simulate:*  │  │Execution jobs          │    │
│  │Intent      │  │optimize:*  │  │Settlement jobs         │    │
│  │Settlement  │  │execution:* │  │                        │    │
│  │Liquidity   │  │verify:*    │  │                        │    │
│  │Alert       │  │            │  │                        │    │
│  │Watchlist   │  │            │  │                        │    │
│  │Relayer     │  │            │  │                        │    │
│  └────────────┘  └────────────┘  └────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                           │
                            │ RPC / API calls via services layer
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SMART CONTRACTS (8 Solidity)                   │
│                                                                  │
│  IntentRouter                                                    │
│    createIntent → fragmentIntent → routeIntent → settleIntent   │
│                                                                  │
│  FragmentVault                                                   │
│    createFragment → settleFragment → withdrawFunds               │
│                                                                  │
│  RouteRegistry                                                   │
│    registerRoute → recordExecution → updateRouteStatus           │
│                                                                  │
│  SettlementVerifier                                              │
│    submitProof → confirmProof → finalizeProof → disputeProof     │
│                                                                  │
│  PrivacyScoreOracle                                              │
│    updateScore → addChain → getScore                             │
│                                                                  │
│  TreasuryFeeCollector                                            │
│    collectFee → distributeToTreasury → setFeeConfig              │
│                                                                  │
│  Governance                                                      │
│    createProposal → castVote → executeProposal                   │
│                                                                  │
│  RelayerRegistry                                                 │
│    registerRelayer → heartbeat → recordRouteResult               │
│    → banRelayer → withdrawStake                                  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN NETWORKS                            │
│  Ethereum (1) — Arbitrum (42161) — Base (8453)                   │
│  Solana (101) — Avalanche (43114) — BNB Chain (56)               │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    0G INFRASTRUCTURE                              │
│  Compute: AI route solver (path optimization)                    │
│  Storage: Route data caching                                    │
│  DA: Settlement proof availability                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: End-to-End Order Lifecycle

### 1. Market Data Ingestion

```
External RPC providers (Alchemy, Solana RPC, etc.)
        │
        ▼
Backend Fastify server (polling/mock data)
        │
        ├──► Redis cache (TTL: 5min for chain data)
        │
        ├──► PostgreSQL (via Prisma) for persistent chain data
        │
        └──► WebSocket broadcast to subscribed clients
                │
                ▼
        Frontend useWebSocket hook
                │
                ├──► market-store.setChains() — updates Market Matrix grid
                ├──► wallet-store.setKpis() — updates header KPI bar
                └──► alert-store.addAlert() — new alert notifications
```

### 2. Order Creation Flow

```
User fills Execution Blotter form (source/dest/amount/options)
        │
        ▼
Step 1: POST /api/execution/simulate
        │
        ├──► Zod validation (simulateSchema)
        ├──► Deterministic cost estimation based on chain gas data
        ├──► Redis cache result (TTL: 300s) or in-memory fallback
        └──► Returns: gas, bridgeFee, slippage, ETA, confidence, fragments
        │
        ▼
Step 2: POST /api/execution/optimize (optional)
        │
        ├──► Zod validation
        ├──► Redis cache result (TTL: 300s)
        └──► Returns: optimizedRoute, gas, savings, confidence, bridges
        │
        ▼
Step 3: POST /api/execution/execute
        │
        ├──► Generates deterministic tx hash
        ├──► Redis cache order (TTL: 3600s) + in-memory Map fallback
        │     └── setTimeout → marks completed after 5s
        └──► Frontend polls GET /api/execution/orders/:id for completion
```

### 3. Settlement Verification Flow

```
User enters tx hash in Settlement Inspector
        │
        ▼
GET /api/settlement/verify/:txHash
        │
        ├──► Redis cache check (TTL: 300s) or DB/proofs lookup
        ├──► Returns 404 with PROOF_NOT_FOUND if not found
        └──► Returns: verified status, block, confirmations
        │
        ▼
POST /api/settlement/inspect (detailed inspection)
        │
        ├──► Zod validation (txHash or routeId)
        └──► Returns: full settlement data
```

### 4. WebSocket Event Flow

```
Client connects to ws://host:3001/ws
        │
        ▼
Server sends: { type: "connected", clientId, channels, timestamp }
        │
        ▼
Client sends: { type: "subscribe", channel: "market" }
        │
        ▼
Server sends events every 3s based on subscriptions:
        │
        ├──► channel "market" → market_update
        │     { type, channel, data: { chain, gas, liquidity, spread } }
        │
        ├──► channel "execution" → execution_update
        │     { type, channel, data: { id, status, progress } }
        │
        ├──► channel "settlement" → settlement_update
        │     { type, channel, data: { txHash, state, confirmations } }
        │
        └──► channel "alerts" → alert
              { type, channel, data: { id, severity, message, timestamp } }
        
Redis Pub/Sub events on "ws:events" channel are also broadcast to subscribed clients.
Server auto-reconnects to Redis and handles cleanup on socket close/error.
```

### 5. Smart Contract Interaction Flow

```
Frontend identifies optimal route via API/AI Solver
        │
        ▼
User confirms → submit to IntentRouter.createIntent()
        │
        ├──► Tokens transferred to contract via safeTransferFrom
        ├──► Intent stored on-chain (tokenIn, tokenOut, amount, chains, privacy)
        │
        ▼
Router role calls IntentRouter.fragmentIntent()
        │
        ├──► Intent state → Fragmented
        ├──► FragmentVault.createFragment() for each fragment
        │     └──► Tokens moved to FragmentVault
        │
        ▼
Router role calls IntentRouter.routeIntent()
        │
        ├──► Intent state → Routed
        └──► Route ID assigned
        │
        ▼
Relayer executes bridge/DEX swaps off-chain
        │
        ▼
SettlementVerifier.submitProof() — proof of delivery
        │
        ├──► SettlementVerifier.confirmProof()
        ├──► SettlementVerifier.finalizeProof() (after confirmation period)
        │
        ▼
IntentRouter.settleIntent()
        │
        ├──► Check minAmountOut (slippage tolerance)
        ├──► Transfer output tokens to user
        └──► Intent state → Settled
```

---

## Component Interaction

### Store Hierarchy

```
Zustand Stores (frontend/src/stores/)
  │
  ├── useMarketStore ────────── Market Matrix data (6 chains)
  ├── useRouteStore ─────────── Active route + AI recommendations
  ├── useAlertStore ─────────── Alert feed (100 max, append-only)
  ├── useSolverStore ────────── Orders, settlements, liquidity, terminal
  ├── useWalletStore ────────── Wallet connection, watchlist, KPI, health
  └── useUIStore ────────────── Sidebar collapsed state (localStorage)
```

### Module ↔ Store Mapping

| Module | Reads From | Writes To |
|--------|-----------|-----------|
| MarketMatrix | useMarketStore (chains) | — |
| RouteVisualizer | useRouteStore (activeRoute, fetches from API) | useRouteStore (setActiveRoute) |
| AiSolver | — (fetches from API directly) | — |
| ExecutionBlotter | useSolverStore (orders) | useSolverStore (addOrder, via API) |
| LiquidityHeatmap | — (fetches from API) | — |
| SettlementInspector | — (fetches from API) | — |
| CommandTerminal | useSolverStore (terminalOutput) | useSolverStore (addTerminalOutput) |
| AlertsFeed | useAlertStore (alerts) | useAlertStore (addAlert, markAlertRead) |
| Watchlist | useWalletStore (watchlist) | useWalletStore (setWatchlist) |
| Sidebar | useWalletStore (systemHealth), useUIStore | useUIStore (toggleSidebar) |
| Header | useWalletStore (kpis) | — |

### WebSocket ↔ Store Mapping

| WS Event Type | Updates Store |
|--------------|---------------|
| `chain_update` | useMarketStore → setChains() |
| `alert` | useAlertStore → addAlert() |
| `kpi_update` | useWalletStore → setKpis() |
| `block_update` | useWalletStore → setSystemHealth() |

---

## Key Design Decisions

1. **Single API Layer**: All `/api/*` requests from the frontend are proxied to the Fastify backend via Next.js rewrites (configured in `next.config.js`). There are no duplicate frontend API routes. The backend is the canonical API for all clients including WebSocket.

2. **Redis as Primary Data Store for Orders**: Execution orders and simulation results live in Redis with TTL, not PostgreSQL. This provides fast reads/writes and automatic cleanup. PostgreSQL stores reference data (chains, routes, relayers). An in-memory Map fallback is used when Redis is unavailable.

3. **Graceful Fallback Architecture**: All backend routes handle null-Prisma and null-Redis gracefully by returning sensible default data. This allows the application to run and be developed without a database connection.

4. **Services Layer**: The backend includes a `services/` directory with integrations for RPC providers (ethers.js), price feeds (CoinGecko), and DeFi data (DeFiLlama). These are ready to be wired to real external APIs.

5. **WebSocket First**: The frontend subscribes to WS events for real-time data. The `useWebSocket` hook loads initial data from the REST API on connect and uses exponential backoff reconnection. No simulation fallback exists -- when no WS URL is configured, the hook falls back to REST polling.

---

## Security Architecture

- **Contracts**: AccessControl (3-4 roles per contract), Pausable (emergency stop), ReentrancyGuard, SafeERC20
- **API**: Rate limiting (100 req/min/IP), Zod input validation, CORS restricted
- **MEV**: Privacy RPC integration, Flashbots support, MEV guard toggle on all orders
- **Relayers**: Staking (min 10 ETH), heartbeat (1hr timeout), slashing (10% stake at 5 failures), governance-based banning

---

## Performance Considerations

- AG Grid uses `domLayout="normal"` with single row selection for optimal rendering
- WebSocket events are generated every 3s with channel-scoped subscriptions
- Redis TTLs: simulation (300s), optimization (300s), execution (3600s), verification (300s)
- Terminal scrollback limited to 500 lines
- Alert feed capped at 100 entries
- Frontend lazy-loads modules via tab switching (no routing)
