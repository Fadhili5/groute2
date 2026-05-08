# GhostRoute Terminal

**Private Cross-Chain Liquidity Execution Terminal**

Institutional-grade terminal for MEV-protected cross-chain routing, order fragmentation, route optimization, and settlement verification. Built for hedge funds, DAOs, market makers, and liquidity providers.

## Quick Start

```bash
# Clone
git clone https://github.com/ghostroute/terminal.git
cd ghostroute-terminal

# Install all dependencies
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start infrastructure
docker compose -f docker/docker-compose.yml up -d

# Initialize database
cd backend && npx prisma db push && npx prisma db seed && cd ..

# Start development
cd backend && npm run dev &
cd frontend && npm run dev &
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

### Frontend — Next.js Terminal
- **Market Matrix**: Real-time chain grid with liquidity, gas, spread, MEV protection scores
- **Execution Blotter**: Full order management with simulate/optimize/execute flow
- **Route Visualizer**: Animated route graph showing each fragment's path and status
- **AI Solver**: 0G-powered route recommendations with confidence scoring
- **Liquidity Heatmap**: Cross-chain depth visualization
- **Settlement Inspector**: On-chain proof verification
- **Command Terminal**: xterm.js terminal for power users
- **Alerts Feed**: Live WebSocket operational feed

### Smart Contracts (Solidity)
| Contract | Purpose |
|----------|---------|
| IntentRouter | Cross-chain intent routing with MEV protection |
| FragmentVault | Asset fragmentation and custody |
| RouteRegistry | Route discovery and performance tracking |
| SettlementVerifier | Cross-chain proof verification |
| PrivacyScoreOracle | Chain privacy scoring oracle |
| TreasuryFeeCollector | Protocol fee management |
| Governance | On-chain governance |
| RelayerRegistry | Relayer staking and management |

### Backend — Fastify API
- RESTful API with Zod validation
- Real-time WebSocket streaming
- Redis caching and BullMQ job queues
- PostgreSQL persistence with Prisma ORM

## Features

- **Private Routing**: Flashbots + privacy RPC integration
- **Order Fragmentation**: Split large orders across routes
- **MEV Protection**: Sandwhich, frontrunning, and backrunning resistance
- **Route Optimization**: AI-powered path discovery
- **Settlement Verification**: On-chain proof validation
- **Treasury Routing**: Multi-sig governance
- **Terminal Commands**: Direct terminal access for power users

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, AG Grid, xterm.js, Recharts, Zustand |
| Backend | Fastify, PostgreSQL, Redis, BullMQ, WebSockets, Prisma |
| Contracts | Solidity 0.8.24, Hardhat, Foundry, OpenZeppelin |
| AI | 0G Labs Compute / Storage / DA |
| Infra | Docker, Kubernetes, GitHub Actions |

## Documentation

- [Architecture](docs/architecture.md)
- [Smart Contracts](docs/contracts.md)
- [Deployment](docs/deployment.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [API Reference](docs/api.md)

## License

MIT — See [LICENSE](LICENSE)
