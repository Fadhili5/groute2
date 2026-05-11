<div align="center">
  <br/>
  <img src="https://img.shields.io/badge/status-production%20ready-22d3ee?style=flat-square" alt="Status"/>
  <img src="https://img.shields.io/badge/solidity-0.8.24-10b981?style=flat-square" alt="Solidity"/>
  <img src="https://img.shields.io/badge/next.js-14-000000?style=flat-square" alt="Next.js"/>
  <img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=flat-square" alt="License"/>
  <br/>
  <br/>
  <h1>GhostRoute Terminal</h1>
  <p><strong>Private Cross-Chain Liquidity Execution Terminal</strong></p>
  <p>Institutional-grade execution infrastructure for MEV-protected cross-chain routing,<br/>
  order fragmentation, route optimization, and on-chain settlement verification.</p>
  <br/>
  <pre align="center">Built for hedge funds · DAOs · market makers · treasury desks · liquidity providers · protocol operators</pre>
  <br/>
</div>

---

## Overview

GhostRoute Terminal is a unified institutional execution console for cross-chain token transfers. It replaces 10+ separate tools with one edge-to-edge terminal interface featuring private routing via Flashbots/private RPC, AI-powered route optimization via 0G Labs, order fragmentation across parallel routes, real-time settlement verification, and MEV protection.

### What It Solves

| Problem | GhostRoute Solution |
|---------|-------------------|
| MEV exposure (frontrunning, sandwich, backrunning) | Flashbots + privacy RPC integration, MEV guard |
| Slippage on large orders | Order fragmentation across 3-5 parallel routes |
| No execution privacy | Opaque order flow, stealth execution |
| Fragmented tooling | Single unified terminal (9 modules, 21 API routes) |
| No settlement guarantees | On-chain proof verification with dispute resolution |
| No route intelligence | AI-powered path discovery via 0G Labs compute |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, AG Grid Enterprise, xterm.js, Recharts, Framer Motion, Zustand, Lucide |
| **Backend** | Fastify 4, PostgreSQL 16 (Prisma ORM), Redis 7 (ioredis), BullMQ, WebSockets, Zod validation, ethers.js v6, Pino |
| **Contracts** | Solidity 0.8.24, Hardhat + Foundry, OpenZeppelin v5, Ethers v6 |
| **AI/Infra** | 0G Labs Compute (solver), Storage (route data), DA (settlement proofs) |
| **Infrastructure** | Docker + Compose, Kubernetes, Coolify, Vercel, GitHub Actions |
| **Design** | Matte dark institutional palette, Bloomberg Terminal + TradingView Pro aesthetic |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GhostRoute Terminal                       │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Market   │  │  Route   │  │    AI    │  │   Command   │ │
│  │  Matrix   │  │Visualizer│  │  Solver  │  │  Terminal   │ │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├─────────────┤ │
│  │Execution │  │Liquidity │  │Settlement│  │Alerts/Watch │ │
│  │ Blotter  │  │ Heatmap  │  │Inspector │  │   list      │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Next.js App Router + API Layer              │   │
│  │  21 API routes (route.ts) + Zustand stores + WS      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  Fastify API Server  │   │  WebSocket wss://host/ws     │
│  Port 3001           │   │  Channels: market,execution, │
│  CORS + Rate Limit   │   │  settlement,alerts           │
│  Redis caching       │   └──────────────────────────────┘
│  BullMQ job queue    │
│  Prisma ORM (PG)     │
└──────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Smart Contracts (8)                        │
│                                                              │
│  IntentRouter · FragmentVault · RouteRegistry                │
│  SettlementVerifier · PrivacyScoreOracle                     │
│  TreasuryFeeCollector · Governance · RelayerRegistry         │
│                                                              │
│  All: AccessControl · Pausable · ReentrancyGuard · NatSpec  │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Blockchain Networks                        │
│  Ethereum (1) · Arbitrum (42161) · Base (8453)              │
│  Solana (101) · Avalanche (43114) · BNB Chain (56)          │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  0G Infrastructure                           │
│  Compute (AI route solver) · Storage (route data cache)     │
│  DA (settlement proof availability)                         │
└─────────────────────────────────────────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for detailed system design, data flow, and component interaction.

---

## Modules (9 Frontend Components)

### 1. Market Matrix
Real-time chain intelligence grid via AG Grid Enterprise. 6 chains x 9 metrics (liquidity, spread, gas, bridge fee, slippage, latency, privacy, MEV, ETA). Live color-coded cells, column visibility toggling, auto-refresh every 30s, WebSocket push updates.

**File:** `frontend/src/components/market-matrix/MarketMatrix.tsx` (353 lines)

### 2. Route Visualizer
Animated route graph showing every fragment's journey: wallet -> fragmentation -> bridge -> DEX -> liquidity pool -> settlement. Each step shows cost, latency, privacy score, confidence, and live status (pending/active/completed/failed). Aggregate metrics footer.

**File:** `frontend/src/components/route-visualizer/RouteVisualizer.tsx` (134 lines)

### 3. AI Solver
Powered by 0G Labs integration (simulated). Recommends optimal paths with confidence scoring (94%), alternatives, bridge health metrics, and MEV forecasts. Explains _why_ each route was chosen.

**File:** `frontend/src/components/ai-solver/AiSolver.tsx` (94 lines)

### 4. Execution Blotter
Full order management form: source/destination asset & chain, amount, privacy toggle, fragmentation mode, slippage tolerance, bridge preference, MEV guard. Three-button workflow: Simulate -> Optimize -> Execute. Status badge tracking.

**File:** `frontend/src/components/execution-blotter/ExecutionBlotter.tsx` (190 lines)

### 5. Liquidity Heatmap
Cross-chain depth visualization via Recharts bar charts + pool grid view. Depth chart with vertical bars colored per chain. Pool grid shows token-level depth, APY, and utilization. Total cross-chain depth display.

**File:** `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx` (121 lines)

### 6. Settlement Inspector
On-chain proof inspection. Enter a tx hash or route ID to view: transaction hash, route ID, proof hash, settlement state, fees, relayer, confirmations. One-click "Verify On-Chain" button.

**File:** `frontend/src/components/settlement-inspector/SettlementInspector.tsx` (116 lines)

### 7. Command Terminal
xterm.js-inspired power-user terminal. Commands:
```
route 50000 usdc arb eth private
simulate 100000 usdt base sol
inspect 0x7f3c...8a
watch mev
compare usdc eth arb
status, help, clear
```
ANSI color support, command history (arrow up/down), 500-line scrollback buffer.

**File:** `frontend/src/components/command-terminal/CommandTerminal.tsx` (195 lines)

### 8. Alerts Feed
Live operational feed with WebSocket streaming. Filter by type: bridge outage, route success, MEV event, liquidity spike, relayer failure, gas spike. Real-time severity indicators (info/warning/critical). Auto-generated alerts every 8s.

**File:** `frontend/src/components/alerts-feed/AlertsFeed.tsx` (142 lines)

### 9. Watchlist
Compact portfolio tracker. 7 assets (USDC, ETH, BTC, SOL, AVAX, ARB, BNB) with price, 24h change %, PnL. Color-coded gain/loss indicators. Chain attribution per asset.

**File:** `frontend/src/components/watchlist/Watchlist.tsx` (78 lines)

---

## Quick Start

```bash
# Clone
git clone https://github.com/elonmasai7/groute.git
cd groute

# Install all dependencies
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start infrastructure (PostgreSQL + Redis)
docker compose -f docker/docker-compose.yml up -d

# Initialize database
cd backend && npx prisma db push && npx prisma db seed && cd ..

# Start backend (terminal 1)
cd backend && npm run dev

# Start frontend (terminal 2)
cd frontend && npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design, data flow, component interaction, state management |
| [API Reference](docs/api.md) | All 21 API endpoints with request/response schemas |
| [Smart Contracts](docs/contracts.md) | 8 Solidity contracts — spec, functions, events, deployment |
| [Deployment Guide](docs/deployment.md) | Local, Docker, K8s, Vercel, Coolify, Production |
| [Data Flow](docs/data-flow.md) | End-to-end transaction flow, state management, WebSocket protocol |
| [State Management](docs/state-management.md) | Zustand stores, store hierarchy, cross-store interactions |
| [Database Schema](docs/database.md) | Prisma models, relationships, migrations |
| [Security](SECURITY.md) | Contract security, MEV protection, key management |
| [Contributing](CONTRIBUTING.md) | Development setup, code standards, PR process |

---

## Project Structure

```
groute/
├── frontend/                        # Next.js 14 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/                 # 21 Next.js API route handlers
│   │   │   │   ├── market/          # chains, liquidity, ticker
│   │   │   │   ├── execution/       # simulate, optimize, execute, orders
│   │   │   │   ├── settlement/      # proofs, verify, inspect
│   │   │   │   ├── routes/          # routes, recommend, simulate, compare
│   │   │   │   ├── alerts/          # alerts, unread, mark-read
│   │   │   │   ├── health/          # health check
│   │   │   │   ├── kpi/             # key performance indicators
│   │   │   │   └── system/          # system health
│   │   │   ├── page.tsx             # Main terminal layout (9 tabs + sidebar)
│   │   │   ├── layout.tsx           # Root layout
│   │   │   └── globals.css          # Tailwind + AG Grid + Recharts themes
│   │   ├── components/
│   │   │   ├── market-matrix/       # AG Grid chain intelligence
│   │   │   ├── route-visualizer/    # Fragment flow visualization
│   │   │   ├── ai-solver/           # AI route recommendation panel
│   │   │   ├── execution-blotter/   # Order entry form
│   │   │   ├── liquidity-heatmap/   # Recharts depth bars + pool grid
│   │   │   ├── settlement-inspector/# Proof verification UI
│   │   │   ├── command-terminal/    # xterm.js terminal emulator
│   │   │   ├── alerts-feed/         # Real-time alert stream
│   │   │   ├── watchlist/           # Portfolio tracker
│   │   │   ├── layout/             # Shell, Sidebar, Header, StatusStrip
│   │   │   └── common/             # ErrorBoundary
│   │   ├── stores/                  # Zustand state management (7 stores)
│   │   ├── hooks/                   # useWebSocket hook
│   │   ├── lib/                     # api-utils, constants, utils
│   │   └── types/                   # TypeScript interfaces
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
│
├── backend/                         # Fastify API server
│   ├── src/
│   │   ├── index.ts                 # Server entry: Fastify + CORS + WS + rate limit
│   │   ├── config.ts                # Env-based configuration
│   │   ├── routes/
│   │   │   ├── market.ts            # /api/market/* (chains, liquidity, ticker)
│   │   │   ├── execution.ts         # /api/execution/* (simulate, optimize, execute)
│   │   │   ├── settlement.ts        # /api/settlement/* (proofs, verify, inspect)
│   │   │   ├── routes.ts            # /api/routes/* (list, recommend, simulate)
│   │   │   └── alerts.ts            # /api/alerts/* (list, unread, read)
│   │   ├── websocket/
│   │   │   └── handler.ts           # WS handler: subscribe/unsubscribe/pub events
│   │   └── middleware/
│   │       └── error.ts             # Error handling (AppError, ZodError, etc.)
│   ├── prisma/
│   │   ├── schema.prisma            # 7 models: Chain, Route, Intent, Settlement,
│   │   │                             #   LiquidityPool, Alert, WatchlistItem, Relayer
│   │   ├── seed.ts                  # Seed script for 6 chains
│   │   └── config.ts
│   └── package.json
│
├── contracts/                       # Solidity smart contracts
│   ├── contracts/
│   │   ├── IntentRouter.sol         # Cross-chain intent routing + fragmentation
│   │   ├── FragmentVault.sol        # Fragment custody + settlement
│   │   ├── RouteRegistry.sol        # Route discovery + performance tracking
│   │   ├── SettlementVerifier.sol   # Proof verification + dispute resolution
│   │   ├── PrivacyScoreOracle.sol   # Chain privacy scoring
│   │   ├── TreasuryFeeCollector.sol # Tiered fee collection + distribution
│   │   ├── Governance.sol           # On-chain proposal + voting
│   │   └── RelayerRegistry.sol      # Relayer staking + heartbeats + slashing
│   ├── test/                        # Hardhat tests
│   ├── scripts/                     # Deployment scripts
│   └── hardhat.config.ts
│
├── docker/
│   ├── docker-compose.yml           # PostgreSQL + Redis + Backend + Frontend
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── k8s/
│   └── deployment.yaml              # Kubernetes manifests
├── docs/                            # Documentation
├── coolify.json                     # Coolify multi-service config
├── vercel.json                      # Vercel deployment config
├── .env.example                     # Environment variables template
├── SECURITY.md
├── CONTRIBUTING.md
└── README.md
```

---

## Deployment Options

| Method | Command |
|--------|---------|
| **Vercel** (frontend only) | `cd frontend && npx vercel --prod` |
| **Coolify** (full stack) | Auto-detected via `coolify.json` |
| **Docker Compose** | `docker compose -f docker/docker-compose.yml up -d --build` |
| **Kubernetes** | `kubectl apply -f k8s/deployment.yaml` |
| **Contracts** | `cd contracts && npx hardhat run scripts/deploy.ts --network <network>` |

See [docs/deployment.md](docs/deployment.md) for detailed guides.

---

## License

MIT — See [LICENSE](LICENSE)
