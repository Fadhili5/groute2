# Deployment Guide

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Local Development](#local-development)
4. [Docker Compose](#docker-compose)
5. [Kubernetes](#kubernetes)
6. [Vercel (Frontend Only)](#vercel-frontend-only)
7. [Coolify (Full Stack)](#coolify-full-stack)
8. [Smart Contracts](#smart-contracts)
9. [Production Checklist](#production-checklist)

---

## Prerequisites

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20+ | Runtime |
| npm | 10+ | Package manager |
| Docker | 24+ | Containerization |
| Docker Compose | 2.24+ | Multi-service orchestration |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | Caching, message queue |
| Kubernetes | 1.28+ | Production orchestration |
| kubectl | 1.28+ | K8s CLI |


---

## Environment Variables

Copy `.env.example` to `.env` in the root directory and configure:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/ghostroute` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Backend API port | `3001` |
| `INTENT_ROUTER` | IntentRouter contract address | `0x0000...0001` |
| `FRAGMENT_VAULT` | FragmentVault contract address | `0x0000...0002` |
| `ROUTE_REGISTRY` | RouteRegistry contract address | `0x0000...0003` |
| `SETTLEMENT_VERIFIER` | SettlementVerifier contract address | `0x0000...0004` |

### RPC Endpoints

| Variable | Description | Default |
|----------|-------------|---------|
| `ETH_RPC` | Ethereum RPC URL | Alchemy demo |
| `ARB_RPC` | Arbitrum RPC URL | Alchemy demo |
| `BASE_RPC` | Base RPC URL | Alchemy demo |
| `SOL_RPC` | Solana RPC URL | Public endpoint |
| `AVAX_RPC` | Avalanche RPC URL | Alchemy demo |
| `BNB_RPC` | BNB Chain RPC URL | Public endpoint |

### 0G Infrastructure

| Variable | Description |
|----------|-------------|
| `ZG_COMPUTE_ENDPOINT` | 0G Compute endpoint |
| `ZG_STORAGE_ENDPOINT` | 0G Storage endpoint |
| `ZG_DA_ENDPOINT` | 0G DA endpoint |

### Frontend Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001/api` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3001/ws` |

---

## Local Development

### 1. Start Infrastructure (PostgreSQL + Redis)

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
```

This starts:
- PostgreSQL 16 on port `5432`
- Redis 7 on port `6379`

### 2. Deploy Smart Contracts (Local)

```bash
cd contracts
npm install
npx hardhat compile

# Terminal 1: Start local Hardhat node
npx hardhat node &

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost
```

### 3. Setup Backend

```bash
cd backend
npm install

# Generate Prisma client
npx prisma generate

# Push schema to PostgreSQL
npx prisma db push

# Seed database with initial data
npx prisma db seed

# Start development server (hot reload)
npm run dev
```

Backend starts on `http://localhost:3001`

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:3000`

---

## Docker Compose

Full-stack deployment using Docker Compose with 4 services.

### Architecture

```
┌─────────────┐     ┌─────────────┐
│  Frontend   │     │   Backend   │
│  :3000      │────▶│  :3001      │
│  Next.js    │     │  Fastify    │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │ PostgreSQL  │          │    Redis    │
       │  :5432      │          │  :6379      │
       └─────────────┘          └─────────────┘
```

### Deployment

```bash
# Build and start all services
docker compose -f docker/docker-compose.yml up -d --build

# View logs
docker compose -f docker/docker-compose.yml logs -f

# Stop all services
docker compose -f docker/docker-compose.yml down

# Reset volumes (data wipe)
docker compose -f docker/docker-compose.yml down -v
```

### Dockerfiles

**Dockerfile.frontend:**
- Multi-stage build (builder + runner)
- Builds Next.js static assets
- Exposes port 3000
- Runs `npm start` in production mode

**Dockerfile.backend:**
- Multi-stage build (builder + runner)
- Generates Prisma client during build
- Compiles TypeScript
- Exposes port 3001

---

## Kubernetes

### Prerequisites
```bash
# Ensure you have a Kubernetes cluster running
kubectl cluster-info

# Apply the deployment
kubectl apply -f k8s/deployment.yaml
```

### Manifests

The `k8s/deployment.yaml` includes:
- **Deployments:** Frontend, Backend, PostgreSQL, Redis
- **Services:** ClusterIP for internal communication
- **ConfigMaps:** Environment variables
- **Secrets:** Database credentials, API keys

### Commands

```bash
# Deploy everything
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods
kubectl get services
kubectl get deployments

# View logs
kubectl logs -f deployment/ghostroute-backend
kubectl logs -f deployment/ghostroute-frontend

# Scale
kubectl scale deployment/ghostroute-backend --replicas=3
kubectl scale deployment/ghostroute-frontend --replicas=3

# Rolling update
kubectl set image deployment/ghostroute-backend backend=ghostroute-backend:v2

# Delete deployment
kubectl delete -f k8s/deployment.yaml
```

---

## Vercel (Frontend Only)

### Setup

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Configuration

The `vercel.json` at project root:

```json
{
  "framework": "nextjs",
  "buildCommand": "cd frontend && npm run build",
  "installCommand": "cd frontend && npm install",
  "outputDirectory": "frontend/.next"
}
```

### Notes
- Vercel deploys the **frontend only**
- Backend must be deployed separately (Coolify, K8s, or cloud VM)
- Set environment variables in Vercel dashboard:
  - `NEXT_PUBLIC_API_URL` → Your backend URL
  - `NEXT_PUBLIC_WS_URL` → Your WS URL `ws://your-backend.com/ws`

---

## Coolify (Full Stack)

Coolify auto-detects the multi-service configuration from `coolify.json`:

```json
{
  "experimentalServices": {
    "frontend": {
      "entrypoint": "frontend",
      "routePrefix": "/",
      "framework": "nextjs"
    },
    "backend": {
      "entrypoint": "backend",
      "routePrefix": "/_/backend"
    }
  }
}
```

### Deployment Steps
1. Connect your Git repository to Coolify
2. Coolify reads `coolify.json` and auto-configures:
   - **Frontend service** at `/` (Next.js)
   - **Backend service** at `/_/backend` (Node.js)
3. Set environment variables in Coolify dashboard
4. Deploy

---

## Smart Contracts

### Local (Hardhat Node)

```bash
cd contracts

# Compile
npx hardhat compile

# Start local node
npx hardhat node

# Deploy
npx hardhat run scripts/deploy.ts --network localhost
```

### Testnet

```bash
# Set environment variable
export DEPLOYER_PRIVATE_KEY=0x...

# Deploy to Arbitrum Sepolia
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# Deploy to Base Sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### Mainnet

```bash
export DEPLOYER_PRIVATE_KEY=0x...

# Deploy to Ethereum mainnet
npx hardhat run scripts/deploy.ts --network ethereum

# Verify contracts
npx hardhat verify --network ethereum <CONTRACT_ADDRESS>
```

### Hardhat Configuration

```typescript
solidity: "0.8.26",     // Compiler version
optimizer: {
  enabled: true,
  runs: 200
}
```

---

## Production Checklist

### Security

- [ ] Replace Alchemy demo API keys with production keys
- [ ] Use secure private key management (not env vars in production)
- [ ] Enable rate limiting on backend (`max: 100, timeWindow: "1 minute"`)
- [ ] Set up CORS to restrict origins
- [ ] Deploy smart contracts with multisig governance
- [ ] Set relayer `MIN_STAKE` to appropriate value
- [ ] Configure Redis authentication
- [ ] Use PostgreSQL with SSL/TLS
- [ ] Implement API authentication (JWT or API keys)

### Infrastructure

- [ ] Set up PostgreSQL replication and backups
- [ ] Configure Redis persistence (RDB/AOF)
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure logging aggregation (ELK/Loki)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure auto-scaling policies
- [ ] Set up health check endpoints monitoring
- [ ] Configure alerting (PagerDuty, Slack)

### Performance

- [ ] Configure CDN for static assets
- [ ] Enable Next.js output caching
- [ ] Tune PostgreSQL connection pool
- [ ] Configure Redis maxmemory policy
- [ ] Set up database indexing for query patterns
- [ ] Enable HTTP/2 for API

### Smart Contracts

- [ ] Run comprehensive test suite
- [ ] Get professional audit (at least one firm)
- [ ] Verify all contracts on block explorers
- [ ] Set up monitoring for contract events
- [ ] Configure timelock delays for governance
- [ ] Test pause/unpause functionality
- [ ] Verify fee calculations with edge cases

### Environment

```bash
# Production .env checklist
DATABASE_URL=postgresql://user:pass@prod-db:5432/ghostroute
REDIS_URL=redis://:password@prod-redis:6379
NODE_ENV=production
PORT=3001

# Replace demo RPC endpoints
ETH_RPC=https://eth-mainnet.g.alchemy.com/v2/PROD_KEY
ARB_RPC=https://arb-mainnet.g.alchemy.com/v2/PROD_KEY
BASE_RPC=https://base-mainnet.g.alchemy.com/v2/PROD_KEY
SOL_RPC=https://api.mainnet-beta.solana.com
AVAX_RPC=https://avax-mainnet.g.alchemy.com/v2/PROD_KEY
BNB_RPC=https://bsc-dataseed.binance.org

# Deployed contract addresses
INTENT_ROUTER=0x<prod-deployed-address>
FRAGMENT_VAULT=0x<prod-deployed-address>
ROUTE_REGISTRY=0x<prod-deployed-address>
SETTLEMENT_VERIFIER=0x<prod-deployed-address>
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `PostgreSQL connection refused` | Ensure PostgreSQL is running: `docker compose up -d postgres` |
| `Redis connection refused` | Ensure Redis is running: `docker compose up -d redis` |
| `PrismaClientInitializationError` | Run `npx prisma generate` then `npx prisma db push` |
| `Module not found` | Run `npm install` in the affected directory |
| `Port already in use` | Change PORT in `.env` or kill existing process |
| `WebSocket connection failed` | Check `NEXT_PUBLIC_WS_URL` matches backend URL |
| `Contract deployment failed` | Verify `DEPLOYER_PRIVATE_KEY` has funds for gas |
| `AG Grid license error` | AG Grid Enterprise requires license key for production |

### Logs

```bash
# Backend (Pino Logger)
cd backend && npm run dev
# Logs are colorized and human-readable with pino-pretty

# Docker
docker compose logs -f backend
docker compose logs -f frontend

# Kubernetes
kubectl logs -f deployment/ghostroute-backend
kubectl logs -f deployment/ghostroute-frontend
```
