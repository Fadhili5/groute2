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

## The Problem

Cross-chain liquidity execution today is broken:

- **MEV exposure** — every public mempool transaction is frontrun, sandwiched, or backrun
- **Slippage** — large orders move markets, costing millions in price impact
- **No privacy** — counterparties see your entire execution strategy
- **Fragmented tooling** — traders juggle 6+ dashboards, spreadsheets, and Telegram bots
- **No settlement guarantees** — bridges fail, relayers go offline, proofs are lost
- **Zero intelligence** — no route optimization, no simulation, no AI recommendations

Institutional traders lose **3-8% per cross-chain trade** to these inefficiencies.

---

## The Solution

GhostRoute Terminal is a **unified institutional execution console** that replaces 10+ separate tools with one edge-to-edge terminal interface. Every module is functional — no placeholders, no mockups, no dead routes.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Private Routing** | Flashbots + privacy RPC integration — no mempool exposure |
| **Order Fragmentation** | Split large orders across 3-5 parallel routes to minimize slippage |
| **Route Optimization** | AI-powered path discovery via 0G Labs compute |
| **Stealth Execution** | Opaque order flow — no counterparty can see your strategy |
| **MEV Protection** | Sandwich, frontrunning, and backrunning resistance built-in |
| **Settlement Verification** | On-chain proof validation with dispute resolution |
| **Treasury Routing** | Multi-sig governance for DAO treasury operations |
| **Liquidity Intelligence** | Real-time cross-chain depth, spread, and gas analytics |
| **Route Simulation** | Zero-risk simulation before any capital moves |
| **Operational Alerts** | Live WebSocket feed for bridge outages, MEV events, gas spikes |
| **AI Solver** | 0G-powered route recommendations with confidence scoring |
| **Terminal Commands** | Power-user terminal: `route`, `simulate`, `inspect`, `watch`, `compare` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GhostRoute Terminal                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Market   │  │  Route   │  │    AI    │  │   Comd  │ │
│  │  Matrix   │  │Visualizer│  │  Solver  │  │ Terminal│ │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├─────────┤ │
│  │Execution │  │Liquidity │  │Settlement│  │ Alerts  │ │
│  │ Blotter  │  │ Heatmap  │  │Inspector │  │ Watchlist│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Next.js API Layer (21 routes)          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Smart Contracts                        │
│                                                         │
│  IntentRouter · FragmentVault · RouteRegistry            │
│  SettlementVerifier · PrivacyScoreOracle                 │
│  TreasuryFeeCollector · Governance · RelayerRegistry     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Blockchain Networks                     │
│  Ethereum · Arbitrum · Base · Solana · Avalanche · BNB  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 0G Infrastructure                        │
│  Compute (AI Solver) · Storage (Route Data) · DA (Proofs)│
└─────────────────────────────────────────────────────────┘
```

---

## Modules

### Market Matrix
Real-time chain intelligence grid. 6 chains × 9 metrics (liquidity, spread, gas, bridge fee, slippage, latency, privacy, MEV, ETA). Dense AG Grid with live color-coded updates.

### Route Visualizer
Animated route graph showing every fragment's journey: wallet → fragmentation → bridge → DEX → liquidity pool → settlement. Each step shows cost, latency, privacy score, confidence, and live status.

### AI Solver
Powered by real 0G Labs integration. Recommends optimal paths with confidence scoring, alternative routes, bridge health metrics, and MEV forecasts. Explains _why_ each route was chosen.

### Execution Blotter
Full order management: source/destination asset & chain, amount, privacy toggle, fragmentation mode, slippage tolerance, bridge preference, MEV guard. Three-button workflow: **Simulate** → **Optimize** → **Execute**.

### Liquidity Heatmap
Cross-chain depth visualization via Recharts bar charts + pool grid view. Real-time APY, utilization, volume, and depth data across all supported chains.

### Settlement Inspector
On-chain proof inspection. Enter a tx hash or route ID to view: transaction hash, route ID, proof hash, settlement state, fees, relayer, confirmations. One-click on-chain verification.

### Command Terminal
xterm.js power-user terminal. Commands:
```
route 50000 usdc arb eth private
simulate 100000 usdt base sol
inspect 0x7f3c...8a
watch mev
compare usdc eth arb
```

### Alerts Feed
Live operational feed with WebSocket streaming. Filters by type: bridge outage, route success, MEV event, liquidity spike, relayer failure, gas spike. Real-time severity indicators.

### Watchlist
Compact portfolio tracker. Price, 24h change, PnL per asset. Chains: USDC, ETH, BTC, SOL, AVAX, ARB, BNB.

---

## Smart Contracts

All contracts written in Solidity 0.8.24 with OpenZeppelin audited components, access control, events, custom errors, pausable, reentrancy protection, gas optimization, and NatSpec.

| Contract | Lines | Purpose |
|----------|-------|---------|
| `IntentRouter.sol` | ~180 | Cross-chain intent routing, fragmentation, settlement |
| `FragmentVault.sol` | ~130 | Asset custody, fragment creation/settlement |
| `RouteRegistry.sol` | ~150 | Route discovery, performance metrics |
| `SettlementVerifier.sol` | ~160 | Proof submission, confirmation, dispute resolution |
| `PrivacyScoreOracle.sol` | ~120 | Chain privacy scoring, MEV resistance |
| `TreasuryFeeCollector.sol` | ~150 | Tiered fee collection, treasury distribution |
| `Governance.sol` | ~170 | Proposal creation, voting, execution |
| `RelayerRegistry.sol` | ~200 | Staking, heartbeats, slashing, bans |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, AG Grid Enterprise, xterm.js, Recharts, Framer Motion, Zustand, Lucide |
| **Backend** | Fastify, PostgreSQL, Redis, BullMQ, WebSockets, Prisma ORM, Zod |
| **Contracts** | Solidity 0.8.24, Hardhat, Foundry, OpenZeppelin v5, Ethers v6 |
| **AI** | 0G Labs Compute, Storage, DA |
| **Infra** | Docker, Docker Compose, Kubernetes, GitHub Actions |
| **Design** | Matte dark institutional palette, Bloomberg Terminal + TradingView Pro aesthetic |

---

## Quick Start

```bash
# Clone
git clone https://github.com/elonmasai7/groute.git
cd groute

# Install dependencies
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start infrastructure
docker compose -f docker/docker-compose.yml up -d

# Initialize database
cd backend && npx prisma db push && npx prisma db seed && cd ..

# Start development servers (two terminals)
cd backend && npm run dev
cd frontend && npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

---

## Deploy to Production

### Vercel (Frontend)
```bash
cd frontend
npx vercel --prod
```

### Coolify (Full Stack)
Auto-detected via `coolify.json` — deploys frontend at `/` and backend at `/_/backend`.

### Docker Compose
```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### Kubernetes
```bash
kubectl apply -f k8s/deployment.yaml
```

### Smart Contracts
```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network ethereum
```

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/market/chains` | All chains with metrics |
| `GET` | `/api/market/liquidity` | Liquidity pool data |
| `GET` | `/api/market/ticker` | Live ticker items |
| `POST` | `/api/execution/simulate` | Simulate route execution |
| `POST` | `/api/execution/optimize` | Optimize route parameters |
| `POST` | `/api/execution/execute` | Execute route order |
| `GET` | `/api/execution/orders` | List recent orders |
| `GET` | `/api/settlement/proofs` | Settlement proofs |
| `GET` | `/api/settlement/verify/:txHash` | On-chain verification |
| `POST` | `/api/settlement/inspect` | Inspect settlement |
| `GET` | `/api/routes` | Registered routes |
| `GET` | `/api/routes/recommend` | AI route recommendation |
| `GET` | `/api/routes/simulate` | Route simulation |
| `POST` | `/api/routes/compare` | Compare two chains |
| `GET` | `/api/alerts` | All alerts |
| `GET` | `/api/alerts/unread` | Unread alert count |
| `PUT` | `/api/alerts/:id/read` | Mark alert read |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/kpi` | Key performance indicators |
| `GET` | `/api/system/health` | System health status |

---

## Directory Structure

```
groute/
├── frontend/                    # Next.js terminal UI (9 modules, 21 API routes)
│   ├── src/app/                 # App router + API layer
│   ├── src/components/          # 12 React components
│   ├── src/stores/              # Zustand state management
│   └── src/types/               # TypeScript definitions
├── contracts/                   # Solidity (8 contracts, tests, deploy scripts)
│   ├── contracts/               # 8 production contracts
│   ├── test/                    # Hardhat/Chai tests
│   └── scripts/                 # Deployment scripts
├── backend/                     # Fastify API server
│   ├── src/routes/              # RESTful route handlers
│   ├── src/websocket/           # WebSocket event streaming
│   └── prisma/                  # Database schema + seed
├── docker/                      # Docker Compose + Dockerfiles
├── k8s/                         # Kubernetes manifests
├── docs/                        # Architecture, contracts, deployment, API docs
├── coolify.json                 # Coolify multi-service config (frontend + backend)
├── vercel.json                  # Vercel deployment config
├── .env.example                 # Environment variables template
├── SECURITY.md                  # Security policy
├── CONTRIBUTING.md              # Contribution guidelines
└── README.md                    # This file
```

---

## Documentation

- [Architecture](docs/architecture.md) — System design, data flow, component interaction
- [Smart Contracts](docs/contracts.md) — Full contract reference, deployment, verification
- [Deployment](docs/deployment.md) — Local, Docker, K8s, Vercel, Coolify guides
- [Security](SECURITY.md) — Contract security, MEV protection, key management
- [API Reference](docs/api.md) — All endpoints with request/response examples
- [Contributing](CONTRIBUTING.md) — Development setup, code standards, PR process

---

## License

MIT — See [LICENSE](LICENSE)
