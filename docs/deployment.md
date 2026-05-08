# Deployment

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7
- Kubernetes cluster (for production)
- Ethereum RPC endpoints

## Local Development

```bash
# 1. Start infrastructure
docker compose -f docker/docker-compose.yml up -d

# 2. Deploy contracts (local hardhat)
cd contracts
npm run compile
npx hardhat node &
npx hardhat run scripts/deploy.ts --network localhost

# 3. Setup backend
cd ../backend
cp ../.env.example .env
npm run db:push
npm run db:seed
npm run dev

# 4. Start frontend
cd ../frontend
npm run dev
```

## Production Deployment

### Docker Compose

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/secrets.yaml
```

### Environment Variables

See `.env.example` for all required variables.

## Contract Deployment

### Mainnet

```bash
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network ethereum
```

### Testnet

```bash
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network arbitrum
```

## Verification

```bash
npx hardhat verify --network ethereum <CONTRACT_ADDRESS>
```
