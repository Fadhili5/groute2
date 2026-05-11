# Database Schema

GhostRoute Terminal uses **PostgreSQL 16** with **Prisma ORM 5** for data persistence.

---

## Schema Overview

7 models across 2 domains:

### Reference Data
- `Chain` — Blockchain network configuration
- `Route` — Registered routes between chains
- `LiquidityPool` — Pool-level liquidity data

### Operational Data
- `Intent` — Routing intents with fragments
- `IntentFragment` — Individual fragment within an intent
- `Settlement` — Settlement proofs and verifications
- `Alert` — System alerts
- `WatchlistItem` — User watchlist entries
- `Relayer` — Relayer node records

---

## Entity Relationship Diagram

```
┌──────────┐     ┌───────────┐     ┌────────────────┐
│  Chain   │◄────│  Route    │     │  Intent        │
│          │     │           │     │                │
│ id (PK)  │     │ id (PK)   │     │ id (PK)        │
│ name     │     │ sourceFK──│──┐  │ userId         │
│ shortName│     │ destFK────│──┐│  │ tokenIn        │
│ chainId  │     │ bridges   │  ││  │ tokenOut       │
│ rpcUrl   │     │ dexes     │  ││  │ amountIn       │
│ status   │     │ avgLatency│  ││  │ minAmountOut   │
└──────────┘     │ successR. │  ││  │ sourceChainFK  │
     │           │ totalVol  │  ││  │ destChainFK    │
     │           └───────────┘  ││  │ privacyLevel   │
     │                          ││  │ fragmented     │
     │     ┌──────────────┐     ││  │ state          │
     │     │ LiquidityPool│     ││  └───────┬────────┘
     │     │              │     ││          │
     │     │ id (PK)      │     ││          │ 1
     │     │ chainFK──────│─────┘│          │
     │     │ token        │      │          │
     │     │ depth        │      │          ▼
     │     │ utilization  │      │  ┌────────────────┐
     │     │ apy          │      │  │ IntentFragment │
     │     │ volume24h    │      │  │                │
     │     │ fee          │      │  │ id (PK)        │
     └──────┴──────────────┘      │  │ intentFK───────│
                                  │  │ token          │
     ┌──────────────┐             │  │ amount         │
     │ Settlement   │             │  │ targetDex      │
     │              │             │  │ settled        │
     │ id (PK)      │             │  └────────────────┘
     │ txHash (UQ)  │
     │ routeId      │     ┌──────────────┐
     │ proofHash    │     │ Alert        │
     │ sourceFK─────│─────┤              │
     │ destFK───────│──┐  │ id (PK)      │
     │ relayerAddr  │  │  │ type         │
     │ amount       │  │  │ severity     │
     │ fee          │  │  │ message      │
     │ state        │  │  │ chainId (opt)│
     │ confirmations│  │  │ read         │
     └──────────────┘  │  │ createdAt    │
                       │  └──────────────┘
     ┌──────────────┐  │
     │ WatchlistItem│  │  ┌──────────────┐
     │              │  │  │ Relayer      │
     │ id (PK)      │  │  │              │
     │ symbol       │  │  │ id (PK)      │
     │ name         │  │  │ address (UQ) │
     │ price        │  │  │ endpoint     │
     │ chainId      │  │  │ stake        │
     └──────────────┘  │  │ totalRoutes  │
                       │  │ succRoutes   │
                       │  │ failRoutes   │
                       │  │ status       │
                       │  │ lastHeartbeat│
                       │  └──────────────┘
```

---

## Model Definitions

### Chain

```prisma
model Chain {
  id        String   @id @default(uuid())
  name      String   @unique
  shortName String
  chainId   Int      @unique
  rpcUrl    String?
  status    String   @default("healthy")

  routes         Route[]
  liquidityPools LiquidityPool[]
  settlements    Settlement[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Indexes:** `name` unique, `chainId` unique

**Status Values:** `healthy` | `degraded` | `down`

**Seed Data:** Ethereum (1), Arbitrum (42161), Base (8453), Solana (101), Avalanche (43114), BNB Chain (56)

---

### Route

```prisma
model Route {
  id            String   @id @default(uuid())
  name          String
  sourceChainId String
  destChainId   String
  maxAmount     Float
  minAmount     Float
  avgLatency    Float    @default(0)
  successRate   Float    @default(100)
  totalVolume   Float    @default(0)
  totalExecs    Int      @default(0)
  status        String   @default("active")

  sourceChain Chain  @relation("SourceChain", fields: [sourceChainId], references: [id])
  destChain   Chain  @relation("DestChain", fields: [destChainId], references: [id])
  bridges     String @default("[]")    // JSON array of bridge IDs
  dexes       String @default("[]")    // JSON array of DEX IDs

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Relations:**
- `sourceChain` → `Chain` (via `RouteRegistry` relation)
- `destChain` → `Chain` (via `DestChain` relation)

**Aggregate Fields:**
- `avgLatency` — Running average (seconds)
- `successRate` — Percentage (0-100)
- `bridges` — JSON serialized array (e.g., `["LayerZero", "Wormhole"]`)

---

### Intent

```prisma
model Intent {
  id              String   @id @default(uuid())
  userId          String              // Wallet address
  tokenIn         String              // Source token symbol
  tokenOut        String              // Destination token symbol
  amountIn        Float
  minAmountOut    Float
  sourceChainId   String
  destChainId     String
  privacyLevel    String   @default("standard")
  fragmented      Boolean  @default(false)
  state           String   @default("created")

  fragments IntentFragment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**State Values:** `created` | `fragmented` | `routed` | `settled` | `failed`

**Privacy Levels:** `standard` | `medium` | `high` | `stealth`

---

### IntentFragment

```prisma
model IntentFragment {
  id        String @id @default(uuid())
  intentId  String
  token     String
  amount    Float
  targetDex String
  settled   Boolean @default(false)

  intent Intent @relation(fields: [intentId], references: [id])
}
```

**Relations:** `intent` → `Intent` (required, cascade)

---

### Settlement

```prisma
model Settlement {
  id             String   @id @default(uuid())
  txHash         String   @unique
  routeId        String
  proofHash      String
  sourceChainId  String
  destChainId    String
  relayerAddress String
  amount         Float
  fee            Float
  state          String   @default("pending")
  confirmations  Int      @default(0)

  sourceChain Chain @relation("SettlementSource", fields: [sourceChainId], references: [id])
  destChain   Chain @relation("SettlementDest", fields: [destChainId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Indexes:** `txHash` unique

**State Values:** `pending` | `confirmed` | `failed` | `finalized`

---

### LiquidityPool

```prisma
model LiquidityPool {
  id           String @id @default(uuid())
  chainId      Int                // References Chain.chainId, not Chain.id
  token        String
  depth        Float               // USD depth in millions
  utilization  Float               // Percentage (0-100)
  apy          Float               // Annual percentage yield
  volume24h    Float               // 24h volume
  fee          Float               // Pool fee in basis points

  chain Chain @relation(fields: [chainId], references: [chainId])
}
```

**Relation:** `chain` → `Chain` (via `chainId`, not primary key `id`)

---

### Alert

```prisma
model Alert {
  id        String   @id @default(uuid())
  type      String
  severity  String
  message   String
  chainId   String?
  read      Boolean  @default(false)

  createdAt DateTime @default(now())
}
```

**Types:** `route_success` | `mev_event` | `bridge_outage` | `gas_spike` | `liquidity_spike` | `relayer_failure`

**Severity:** `info` | `warning` | `critical`

---

### WatchlistItem

```prisma
model WatchlistItem {
  id      String @id @default(uuid())
  symbol  String
  name    String
  price   Float
  chainId String
}
```

**Pre-populated Items:** USDC, ETH, BTC, SOL, AVAX, ARB, BNB

---

### Relayer

```prisma
model Relayer {
  id               String    @id @default(uuid())
  address          String    @unique
  endpoint         String
  stake            Float     @default(0)
  totalRoutes      Int       @default(0)
  successfulRoutes Int       @default(0)
  failedRoutes     Int       @default(0)
  status           String    @default("inactive")
  lastHeartbeat    DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Indexes:** `address` unique

**Status Values:** `inactive` | `active` | `slashed` | `banned`

---

## Seed Data

The `prisma/seed.ts` script initializes 6 chains:

```bash
npx prisma db seed
```

| Chain | Chain ID | Status |
|-------|----------|--------|
| Ethereum | 1 | healthy |
| Arbitrum | 42161 | healthy |
| Base | 8453 | healthy |
| Solana | 101 | healthy |
| Avalanche | 43114 | degraded |
| BNB Chain | 56 | healthy |

---

## Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (no migration)
npx prisma db push

# Create a migration
npx prisma migrate dev --name init

# Apply migrations to production
npx prisma migrate deploy

# Seed database
npx prisma db seed

# Open Prisma Studio (GUI)
npx prisma studio

# Format schema file
npx prisma format
```

---

## Connection

```env
# .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ghostroute
```

The Prisma client is instantiated in `backend/src/index.ts`:
```typescript
const prisma = new PrismaClient();
```

It's passed as dependency injection to all route modules:
```typescript
app.register(marketRoutes, { prefix: "/api/market", prisma, redis });
```
