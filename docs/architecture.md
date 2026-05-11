# Architecture

## System Overview

GhostRoute Terminal is a three-tier cross-chain execution platform:

| Tier | Technology | Purpose |
|------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) + Zustand + AG Grid + Recharts + xterm.js | Institutional trading terminal UI |
| **Backend** | Fastify 4 + Prisma ORM + PostgreSQL + Redis + BullMQ + WebSockets | API server, data persistence, real-time streaming |
| **Contracts** | Solidity 0.8.24 + OpenZeppelin v5 | On-chain intent routing, settlement, governance |

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
│  │              Zustand State Management (7 stores)          │   │
│  │  market-store ── route-store ── alert-store ── solver    │   │
│  │  wallet-store ── ui-store ── terminal-store              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js API Layer (21 route.ts)              │   │
│  │  /api/market/*  /api/execution/*  /api/settlement/*      │   │
│  │  /api/routes/*  /api/alerts/*     /api/health            │   │
│  │  /api/kpi       /api/system/*                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              WebSocket Client (useWebSocket hook)          │   │
│  │  Auto-connect · Reconnect (5s) · Sim fallback ·          │   │
│  │  Handles: chain_update, alert, price_update, kpi_update  │   │
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
                           │ ethers.js RPC calls
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
        ├──► Redis cache result (TTL: 300s)
        └──► Returns: gas, bridgeFee, slippage, ETA, confidence
        │
        ▼
Step 2: POST /api/execution/optimize (optional)
        │
        ├──► Zod validation
        ├──► Redis cache result (TTL: 300s)
        └──► Returns: optimizedRoute, gas, savings, confidence
        │
        ▼
Step 3: POST /api/execution/execute
        │
        ├──► Generates mock tx hash
        ├──► Redis cache order (TTL: 3600s)
        │     └── setTimeout → marks completed after 5s
        └──► Returns: order with 'executing' status
```

### 3. Settlement Verification Flow

```
User enters tx hash in Settlement Inspector
        │
        ▼
GET /api/settlement/verify/:txHash
        │
        ├──► Redis cache check (TTL: 300s)
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
Server sends: { type: "connected", clientId, channels }
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
              { type, channel, data: { severity, message, timestamp } }
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
  ├── useUIStore ────────────── Sidebar collapsed state (localStorage)
  └── useTerminalStore ──────── Terminal data (comprehensive, used by some modules)
```

### Module ↔ Store Mapping

| Module | Reads From | Writes To |
|--------|-----------|-----------|
| MarketMatrix | useMarketStore (chains) | — |
| RouteVisualizer | useRouteStore (activeRoute) | — |
| AiSolver | — | — (local state) |
| ExecutionBlotter | — | — (local state) |
| LiquidityHeatmap | — | — (local state) |
| SettlementInspector | — | — (local state) |
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

1. **Dual API Layer**: Both frontend (Next.js route.ts) and backend (Fastify) expose identical API endpoints. The frontend handles direct SSR/CSR requests; the backend is the canonical API for external clients and WebSocket.

2. **Redis as Primary Data Store for Orders**: Execution orders and simulation results live in Redis with TTL, not PostgreSQL. This provides fast reads/writes and automatic cleanup. PostgreSQL stores reference data (chains, routes, relayers).

3. **Mock Data Architecture**: The system uses deterministic mock data throughout for demo/MVP. All routes return structured sample data from in-memory arrays. The infrastructure for real chain connections exists (RPC configs, ethers.js dependency) but is not wired.

4. **WebSocket First**: The frontend subscribes to WS events for real-time data. The `useWebSocket` hook auto-switches between simulated data (no URL) and live WS (URL provided), with 5s auto-reconnect.

5. **Simulation via setTimeout**: Execution routes simulate async workflow using setTimeout to transition order states (e.g., executing → completed after 5s).

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
