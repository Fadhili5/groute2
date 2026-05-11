# Live Data Architecture & Migration Plan

## Current State Assessment

The entire system is 100% mock/hardcoded. Every backend route returns in-memory arrays. Every frontend API route returns hardcoded JSON. The WebSocket generates fake events. Wallet connection is `setConnected(true)` with a hardcoded address.

## a. Live Data Sources Plan

### External DEX/Routing APIs (for quotes & route simulation)

| API | Purpose | Integration Point |
|-----|---------|-------------------|
| **1inch Aggregator** `https://api.1inch.dev/swap/v5.2/{chainId}/quote` | Real DEX swap quotes, price impact, route calldata | `backend/src/services/oneInchService.ts` |
| **LI.FI** `https://li.quest/v1/quote` | Cross-chain quotes (bridges + DEXs aggregated) | `backend/src/services/lifiService.ts` |
| **Socket** `https://api.socket.tech/v2/quote` | Bridge/DEX route aggregation with gas estimates | `backend/src/services/socketService.ts` |
| **ParaSwap** `https://api.paraswap.io/prices/` | DEX aggregation with full calldata for execution | `backend/src/services/paraSwapService.ts` |

### Service Layer Pattern

Create `backend/src/services/` files (currently empty):

```
backend/src/services/
├── oneInchService.ts      # 1inch Aggregator wrapper
├── lifiService.ts         # LI.FI cross-chain quotes
├── socketService.ts       # Socket.tech API wrapper
├── paraSwapService.ts     # ParaSwap API wrapper  
├── coinGeckoService.ts    # Token prices + market data
├── defiLlamaService.ts    # TVL, volume, fees per chain/protocol
├── rpcService.ts          # ethers.js JsonRpcProvider management
├── priceService.ts        # Aggregated price feed (oracle + CEX/DEX)
└── chainMetricsService.ts # Aggregated chain health metrics
```

### RPC Endpoints

Each chain needs a real RPC. Current `config.ts` has `demo` keys—these must be replaced:

```
backend/src/config.ts changes:
- ETH_RPC: https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
- ARB_RPC: https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
- BASE_RPC: https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
- SOL_RPC: https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
- AVAX_RPC: https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
- BNB_RPC: https://bsc-dataseed1.binance.org (free, no key needed)
```

Use `ethers.JsonRpcProvider` instances cached by chain ID (singletons).

### Token Prices

| Source | What | How |
|--------|------|-----|
| **CoinGecko** `pro-api.coingecko.com` | Real-time token prices, 24h change, market cap | Poll every 60s, cache 30s in Redis |
| **Chainlink Price Feeds** | On-chain ETH/USD, BTC/USD, etc. | Read via ethers.js `AggregatorV3Interface` |
| **Uniswap V3 TWAP** | Pool-derived prices as fallback | `IUniswapV3Pool.observe()` for 30-min TWAP |

### Chain Metrics (TVL, Volume, Fees)

| Source | Endpoint | Data |
|--------|----------|------|
| **DeFiLlama** | `https://api.llama.fi/v2/chains` | Chain-level TVL, volume, fees |
| **DeFiLlama** | `https://api.llama.fi/protocol/{protocol}` | Per-protocol TVL, tokens, pools |
| **CoinGecko** | `/api/v3/coins/{id}/market_chart` | Price history, volatility metrics |
| **L2Beat** | `https://l2beat.com/api/tvl` | L2 TVL breakdowns, risk scores |

## b. Backend Refactoring Plan

### Replace Every Mock Route

Each backend route file needs a full rewrite to use either Prisma DB queries or external API calls. Here is the file-by-file plan:

#### `backend/src/routes/market.ts`

```typescript
// REPLACE ALL HARDCODED CHAINS ARRAY WITH:
// GET /api/market/chains
// - Read from prisma.chain.findMany({ include: { liquidityPools: true } })
// - For each chain, fetch live gas via rpcService.getGasPrice(chainId)
// - Fetch TVL from defiLlamaService.getChainTvl(chain.shortName)
// - Cache result in Redis with TTL 30s

// GET /api/market/liquidity  
// - Read from prisma.liquidityPool.findMany()
// - For each pool, optionally fetch on-chain reserves via rpcService.getPoolReserves()
// - Cache in Redis TTL 60s

// GET /api/market/ticker
// - Aggregate: recent settlements, gas spikes (from rpcService), bridge health
// - This should be derived from real events, not hardcoded
```

#### `backend/src/routes/execution.ts`

```typescript
// POST /api/execution/simulate
// - Call external routing APIs (1inch, LI.FI, Socket, ParaSwap) in PARALLEL
// - Use Promise.any() pattern — take fastest response, fall back to next
// - Return real gas estimates, price impact, route steps
// - Store result in Redis TTL 120s
// - Also record to prisma.intent with state "simulated"

// POST /api/execution/optimize
// - Compare multiple routing API responses
// - Score each by: total cost (gas + bridge fee + slippage), privacy, speed
// - Return optimal route + alternatives

// POST /api/execution/execute
// - Create on-chain intent: user approves → backend calls IntentRouter.createIntent()
// - OR for non-custodial: return calldata for user to sign via wallet
// - Create prisma.intent record with state "executing"
// - Enqueue BullMQ job to monitor settlement

// GET /api/execution/orders
// - Query prisma.intent.findMany() sorted by createdAt desc
// - Include fragments, limit to 50
```

#### `backend/src/routes/settlement.ts`

```typescript
// GET /api/settlement/proofs
// - Query prisma.settlement.findMany({ orderBy: { createdAt: 'desc' } })
// - Optionally verify on-chain via rpcService.getTransactionReceipt(txHash)

// GET /api/settlement/verify/:txHash
// - Real on-chain verification:
//   1. rpcService.getTransactionReceipt(txHash)
//   2. Check confirmations against block number
//   3. Verify event logs match expected SettlementVerifier events
// - Update prisma.settlement if confirmations increased

// POST /api/settlement/inspect
// - Query prisma.settlement by txHash or routeId
// - Cross-reference with on-chain state
```

#### `backend/src/routes/routes.ts`

```typescript
// GET /api/routes/
// - Query prisma.route.findMany() with sourceChain/destChain relations
// - Compute live metrics from RouteRegistry contract events

// GET /api/routes/recommend
// - Use aggregated data from LI.FI / Socket to find best available route
// - Apply scoring: latency weight 0.3, cost weight 0.4, success rate weight 0.2, privacy weight 0.1

// POST /api/routes/compare
// - Compare two chain pairs using real data from defiLlamaService + rpcService
// - Return structured comparison with recommendation
```

#### `backend/src/routes/alerts.ts`

```typescript
// GET /api/alerts/
// - Query prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
// - Generate alerts based on real conditions:
//   - Gas spike: compare current vs moving average (from rpcService)
//   - Bridge outage: check recent settlement success rates
//   - MEV event: monitor Flashbots relay status
//   - Liquidity change: compare current vs previous DeFiLlama snapshot

// PUT /api/alerts/:id/read
// - prisma.alert.update({ where: { id }, data: { read: true } })
```

### Inline Routes in `backend/src/index.ts`

```typescript
// REPLACE /api/kpi (currently hardcoded 847M TVL)
// - Aggregate from defiLlamaService.getChainTvl() for total TVL
// - Sum prisma.settlement.amount for 24h volume
// - Count prisma.intent where state = 'settled' in last 24h

// REPLACE /api/system/health
// - Check RPC connectivity for each chain (rpcService.isConnected())
// - Count active relayers from prisma.relayer

// REPLACE /api/health
// - Keep basic: check DB connection, Redis ping, RPC status
```

### Redis Caching Strategy

| Cache Key Pattern | TTL | Data |
|-------------------|-----|------|
| `gas:{chainId}` | 12s | Current gas price (fast/standard/slow) |
| `price:{tokenSymbol}` | 30s | Token price in USD |
| `chain:tvl:{chainId}` | 60s | Chain TVL |
| `chain:metrics:{chainId}` | 60s | Volume, fees, utilization |
| `route:quote:{fromChain}-{toChain}-{tokenIn}-{tokenOut}-{amount}` | 30s | Best route quote |
| `pool:reserves:{chainId}:{poolAddress}` | 30s | Pool reserves |
| `block:{chainId}` | 12s | Latest block number |
| `simulate:{id}` | 120s | Simulation results |
| `verify:{txHash}` | 300s | Verification results |

### BullMQ Job Queue Setup

`backend/src/jobs/` (currently empty) needs these files:

```
backend/src/jobs/
├── index.ts               # Queue definitions + worker setup
├── priceUpdate.job.ts     # Every 60s: fetch CoinGecko prices → update Redis
├── chainMetrics.job.ts    # Every 120s: fetch DeFiLlama → update DB + Redis
├── transactionMonitor.job.ts  # Poll pending txs → update Settlement records
├── rpcHealthCheck.job.ts  # Every 30s: ping all RPCs → update Chain.status
└── alertGenerator.job.ts  # Every 15s: check conditions → create Alert records
```

```typescript
// backend/src/jobs/index.ts
import { Queue, Worker } from 'bullmq';

export const priceQueue = new Queue('price-updates', { connection: redisConfig });
export const metricsQueue = new Queue('chain-metrics', { connection: redisConfig });
export const monitorQueue = new Queue('transaction-monitor', { connection: redisConfig });

// Workers process in background
new Worker('price-updates', priceUpdateJob, { connection: redisConfig });
new Worker('chain-metrics', chainMetricsJob, { connection: redisConfig });
new Worker('transaction-monitor', transactionMonitorJob, { connection: redisConfig });

// Schedule recurring jobs
import { cron } from 'bullmq';
cron(priceQueue, '*/60 * * * * *', {});     // Every 60 seconds
cron(metricsQueue, '*/120 * * * * *', {});  // Every 120 seconds
cron(monitorQueue, '*/15 * * * * *', {});   // Every 15 seconds
```

### WebSocket Real Event Streaming

`backend/src/websocket/handler.ts` (currently generates fake events):

```typescript
// REPLACE generateEvent() mock with real data sources:
// - Subscribe to blockchain events via ethers.js provider.on("block")
// - Emit "market_update" when gas prices change significantly
// - Emit "execution_update" when BullMQ processes state transitions
// - Emit "settlement_update" on TransactionReceipt confirmation
// - Emit "alert" when alertGenerator creates new alerts
// - Use Redis Pub/Sub: workers publish events → WS handler subscribes

// Pattern:
// 1. BullMQ job completes → publishes to Redis channel "ws:events"
// 2. WebSocket handler subscribes to Redis Pub/Sub
// 3. On message: route to appropriate client subscriptions
// 4. Also emit on raw ethers.js events (new blocks, mempool)
```

### ethers.js Provider Configuration

Create `backend/src/services/rpcService.ts`:

```typescript
import { ethers } from 'ethers';
import { config } from '../config.js';

const providers = new Map<number, ethers.JsonRpcProvider>();

const RPC_MAP: Record<number, string> = {
  1: config.rpc.ethereum,
  42161: config.rpc.arbitrum,
  8453: config.rpc.base,
  101: config.rpc.solana,
  43114: config.rpc.avalanche,
  56: config.rpc.bnb,
};

export function getProvider(chainId: number): ethers.JsonRpcProvider {
  if (!providers.has(chainId)) {
    providers.set(chainId, new ethers.JsonRpcProvider(RPC_MAP[chainId], chainId, {
      staticNetwork: true,  // Don't auto-detect network
    }));
  }
  return providers.get(chainId)!;
}

export async function getGasPrice(chainId: number): Promise<bigint> {
  const provider = getProvider(chainId);
  const feeData = await provider.getFeeData();
  return feeData.gasPrice ?? 0n;
}

export async function getLatestBlock(chainId: number): Promise<number> {
  const provider = getProvider(chainId);
  return provider.getBlockNumber();
}
```

## c. Frontend Refactoring Plan

### 1. Remove Mock Next.js API Routes

Delete ALL files under `frontend/src/app/api/` (21 route.ts files). The frontend should call `http://localhost:3001` (the Fastify backend) directly.

### 2. Create API Client

`frontend/src/lib/api-client.ts` — a centralized fetch wrapper (no more scattered `fetch()` calls):

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<T> { /* ... */ }
  async post<T>(path: string, body: unknown): Promise<T> { /* ... */ }
  async put<T>(path: string, body: unknown): Promise<T> { /* ... */ }
}

export const api = new ApiClient(API_BASE);
```

Update `frontend/src/lib/constants.ts`:
```typescript
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
```

### 3. Store Actions (API Calls Belong Here)

Update each Zustand store to expose async actions that call the real backend:

#### `frontend/src/stores/market-store.ts`

```typescript
// Replace bare state setters with:
export const useMarketStore = create<MarketState>((set) => ({
  chains: [],
  loading: false,
  error: null,
  
  fetchChains: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{ chains: Chain[] }>('/api/market/chains');
      set({ chains: data.chains, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  
  fetchLiquidityPools: async () => {
    const data = await api.get<{ pools: LiquidityPool[] }>('/api/market/liquidity');
    // ... set pools
  },
}));
```

#### `frontend/src/stores/wallet-store.ts`

```typescript
// Replace hardcoded connect/disconnect with RainbowKit/wagmi integration
// Remove: connect: () => set({ address: "0x742d...", balance: 100000 })
// Replace with:
import { useAccount, useBalance, useDisconnect } from 'wagmi';

// The wagmi hooks manage state via providers, not our Zustand store.
// Instead, sync wagmi state TO our store:
// In a <HydrationWrapper> component:
//   const { address, isConnected } = useAccount();
//   useEffect(() => {
//     if (isConnected && address) {
//       useWalletStore.getState().setConnected(address);
//     }
//   }, [isConnected, address]);
//
// Remove all mock KPIs — fetch from API:
  fetchKpis: async () => {
    const data = await api.get<KPI>('/api/kpi');
    set({ kpis: data });
  },
  fetchSystemHealth: async () => {
    const data = await api.get<SystemHealth>('/api/system/health');
    set({ systemHealth: data });
  },
```

#### `frontend/src/stores/route-store.ts`

```typescript
// Replace bare setters with:
  fetchRoutes: async () => {
    const data = await api.get<{ routes: Route[] }>('/api/routes');
    // set routes
  },
  fetchRecommendation: async () => {
    const data = await api.get<{ recommended: AIRecommendation }>('/api/routes/recommend');
    set({ aiRecommendation: data.recommended });
  },
  simulateRoute: async (params: SimulationParams) => {
    const data = await api.post<RouteVisualization>('/api/routes/simulate', params);
    set({ activeRoute: data });
  },
```

#### `frontend/src/stores/alert-store.ts`

```typescript
  fetchAlerts: async () => {
    const data = await api.get<{ alerts: Alert[] }>('/api/alerts');
    set({ alerts: data.alerts });
  },
  markAsRead: async (id: string) => {
    await api.put(`/api/alerts/${id}/read`, {});
    set((s) => ({
      alerts: s.alerts.map((a) => a.id === id ? { ...a, read: true } : a),
    }));
  },
```

### 4. Component Changes

#### `frontend/src/components/market-matrix/MarketMatrix.tsx`

```typescript
// REPLACE:
//   useEffect(() => fetch("/api/market/chains")...)
// WITH:
//   useEffect(() => { useMarketStore.getState().fetchChains() }, []);
//
// Replace 30s polling with WebSocket subscription:
// The useWebSocket hook will push chain_update events
//
// Keep AG Grid render logic identical — only data source changes
```

#### `frontend/src/components/execution-blotter/ExecutionBlotter.tsx`

```typescript
// REPLACE setTimeout-based mock simulation with real API calls:
// handleSimulate:
//   const result = await api.post('/api/execution/simulate', {
//     sourceAsset, destinationAsset, sourceChain, destChain,
//     amount: parseFloat(amount), privacyMode, fragmentationMode,
//     slippageTolerance: parseFloat(slippage), bridgePreference: bridge,
//     mevGuard
//   });
//   setStatus("simulated");
//
// handleExecute:
//   Instead of setTimeout, call api.post('/api/execution/execute')
//   For non-custodial: receive calldata, prompt wallet sign via wagmi useSendTransaction
```

#### `frontend/src/components/ai-solver/AiSolver.tsx`

```typescript
// REPLACE hardcoded RECOMMENDATION object:
// useEffect(() => {
//   useRouteStore.getState().fetchRecommendation();
// }, []);
// 
// const rec = useRouteStore((s) => s.aiRecommendation);
// If null, show loading skeleton; otherwise render real data
```

#### `frontend/src/components/settlement-inspector/SettlementInspector.tsx`

```typescript
// REPLACE createSample() with:
// useEffect(() => {
//   api.get('/api/settlement/proofs').then(data => setSettlements(data.proofs));
// }, []);
//
// handleInspect: call api.post('/api/settlement/inspect', { txHash: txInput })
```

#### `frontend/src/components/alerts-feed/AlertsFeed.tsx`

```typescript
// REPLACE createInitialAlerts() + simulated interval with:
// useEffect(() => {
//   useAlertStore.getState().fetchAlerts();
// }, []);
//
// Keep the WebSocket subscription for real-time alerts
// Remove the setInterval(8000ms) simulated alert generator
```

#### `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx`

```typescript
// REPLACE hardcoded DATA + GRID_DATA arrays with:
// useEffect(() => {
//   api.get('/api/market/liquidity').then(data => {
//     // Transform API pools into chart format
//   });
// }, []);
```

#### `frontend/src/components/layout/StatusStrip.tsx`

```typescript
// REPLACE DEFAULT_TICKER with live WebSocket data:
// Subscribe to channel "market" and render ticker items from WS events
// fetch('/api/market/ticker') on mount + periodic refresh
```

### 5. Wallet Connection (RainbowKit + wagmi)

Add to `frontend/package.json`:
```json
{
  "dependencies": {
    "wagmi": "^2.x",
    "viem": "^2.x",
    "@rainbow-me/rainbowkit": "^2.x",
    "@tanstack/react-query": "^5.x"
  }
}
```

Create `frontend/src/lib/wagmi.ts`:
```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, arbitrum, base, avalanche, bsc } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'GhostRoute Terminal',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
  chains: [mainnet, arbitrum, base, avalanche, bsc],
});
```

Update `frontend/src/app/layout.tsx`:
```typescript
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/lib/wagmi';

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
```

Create `frontend/src/components/layout/WalletButton.tsx` (replace `useWalletStore.connect()`):
```typescript
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletButton() {
  return <ConnectButton />;
}
```

### 6. Real Transaction Submission

Update `ExecutionBlotter.tsx` handleExecute:
```typescript
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

// For non-custodial execution:
// 1. Call POST /api/execution/execute → get { calldata, to, value }
// 2. User signs via wagmi useSendTransaction
// 3. On receipt, call POST /api/execution/confirm with txHash

const { sendTransactionAsync } = useSendTransaction();

const handleExecute = async () => {
  const { calldata, to, value } = await api.post('/api/execution/execute', formData);
  const tx = await sendTransactionAsync({ to, data: calldata as `0x${string}`, value: BigInt(value) });
  setStatus(`submitted: ${tx}`);
  // Poll for confirmation...
};
```

### 7. Live Price Feeds

The `useWebSocket` hook is already well-structured. Update it:

```typescript
// frontend/src/hooks/useWebSocket.ts
// The simulation path (when !url) should be removed entirely in production.
// Always connect to WS_URL.
// Add handlers for:
// - price_update → update market store prices
// - liquidity_update → update solver store pools
// - execution_update → update solver store orders
// - settlement_update → update solver store settlements
//
// Keep auto-reconnect (5s backoff) — already implemented
```

## d. Database Migration Plan

### Schema Additions Needed

Add to `backend/prisma/schema.prisma`:

```prisma
model TokenPrice {
  id        String   @id @default(uuid())
  symbol    String
  priceUsd  Float
  source    String   // "coingecko" | "chainlink" | "oracle"
  timestamp DateTime @default(now())
  
  @@index([symbol, timestamp])
}

model PoolReserve {
  id        String   @id @default(uuid())
  chainId   Int
  poolAddress String
  token0    String
  token1    String
  reserve0  Float
  reserve1  Float
  timestamp DateTime @default(now())
  
  @@index([chainId, poolAddress, timestamp])
}

model GasPrice {
  id        String   @id @default(uuid())
  chainId   Int
  slow      Float
  standard  Float
  fast      Float
  timestamp DateTime @default(now())
  
  @@index([chainId, timestamp])
}
```

### Seed Real Chain Data

`backend/prisma/seed.ts` should be rewritten to:

```typescript
// Instead of hardcoded seed data, provide:
// 1. Chain records with real RPC URLs (from env)
// 2. Run initial fetch: defiLlamaService.getChainTvl() for each chain
// 3. Run initial fetch: coinGeckoService.getPrices() for common tokens
// 4. Create initial WatchlistItems with real prices
// 5. Register known RouteRegistry contracts on each chain
```

### Storing Historical Data

```prisma
// For historical analytics, add to schema:
model PriceHistory {
  id        String   @id @default(uuid())
  symbol    String
  priceUsd  Float
  timestamp DateTime @default(now())
  
  @@index([symbol, timestamp])
  @@index([timestamp])
}

model TransactionHistory {
  id         String   @id @default(uuid())
  txHash     String   @unique
  userId     String   // wallet address
  intentId   String?
  chainId    Int
  type       String   // "swap" | "bridge" | "settlement"
  status     String
  amount     Float
  gasUsed    Float
  timestamp  DateTime @default(now())
  
  @@index([userId, timestamp])
  @@index([chainId, status])
}
```

### Indexing Strategy

| Table | Index | Reason |
|-------|-------|--------|
| `Settlement` | `(sourceChainId, destChainId, createdAt)` | Cross-chain route analytics |
| `Settlement` | `(state, createdAt)` | Active settlement monitoring |
| `Intent` | `(userId, state)` | Per-user order history |
| `Intent` | `(state, createdAt)` | Queue processing |
| `Alert` | `(type, severity, read)` | Alert filtering |
| `LiquidityPool` | `(chainId, token)` | Pool lookups |
| `PriceHistory` | `(symbol, timestamp)` | Time-series queries |
| `TransactionHistory` | `(userId, timestamp)` | User activity feed |

## e. Smart Contract Integration

### Deployment Plan

Contracts already exist in `contracts/` directory. Deploy to testnets first:

| Contract | Ethereum Sepolia | Arbitrum Sepolia | Base Sepolia |
|----------|-----------------|-------------------|--------------|
| IntentRouter | ✓ | ✓ | ✓ |
| FragmentVault | ✓ | ✓ | ✓ |
| RouteRegistry | ✓ (main hub) | — | — |
| SettlementVerifier | ✓ (main hub) | — | — |
| PrivacyScoreOracle | ✓ | — | — |
| TreasuryFeeCollector | ✓ | — | — |
| Governance | ✓ | — | — |
| RelayerRegistry | ✓ | — | — |

Deployment script `contracts/scripts/deploy.ts` should:
1. Deploy all 8 contracts
2. Set up role assignments
3. Configure cross-chain peers (for bridge contracts)
4. Output addresses to `.env.deployed`

### Backend ↔ Contract Interaction

`backend/src/services/contractService.ts`:

```typescript
import { ethers } from 'ethers';
import { config } from '../config.js';
import { getProvider } from './rpcService.js';

const INTENT_ROUTER_ABI = [/* ABI from artifacts */];

export function getIntentRouter(chainId: number, signer?: ethers.Signer) {
  const provider = getProvider(chainId);
  const wallet = signer ?? new ethers.Wallet(config.contracts.privateKey, provider);
  return new ethers.Contract(config.contracts.intentRouter, INTENT_ROUTER_ABI, wallet);
}

export async function createOnChainIntent(params: {
  tokenIn: string; tokenOut: string; amountIn: bigint;
  minAmountOut: bigint; sourceChain: number; destChain: number;
  privacy: number; fragmented: boolean;
}) {
  const contract = getIntentRouter(params.sourceChain);
  const tx = await contract.createIntent(
    params.tokenIn, params.tokenOut, params.amountIn,
    params.minAmountOut, params.sourceChain, params.destChain,
    params.privacy, params.fragmented
  );
  const receipt = await tx.wait();
  // Parse IntentCreated event → extract intentId
  return receipt;
}
```

### Transaction Lifecycle with Real Contracts

```
User fills Execution Blotter → clicks Execute
        │
        ▼
POST /api/execution/execute
        │
        ├── Backend queries routing APIs (1inch/LI.FI/etc.)
        ├── Constructs calldata for each routing step
        ├── If CUSTODIAL mode:
        │     Backend calls IntentRouter.createIntent()
        │     Backend manages FragmentVault operations
        │     Backend monitors SettlementVerifier events
        │
        ├── If NON-CUSTODIAL mode:
        │     Returns { to, data, value } to frontend
        │     Frontend: wallet.sendTransaction({ to, data, value })
        │     Frontend: POST /api/execution/confirm with txHash
        │     Backend: monitors tx via provider.on("block")
        │
        ▼
On transaction receipt:
        ├── Backend creates prisma.Settlement record
        ├── BullMQ job monitors confirmations
        ├── When MIN_CONFIRMATIONS reached:
        │     SettlementVerifier.confirmProof()
        │     prisma.Settlement.state = "confirmed"
        │     WebSocket emits settlement_update
        │
        └── After FINALIZATION_PERIOD:
              SettlementVerifier.finalizeProof()
              prisma.Settlement.state = "finalized"
              IntentRouter.settleIntent()
              WebSocket emits settlement_update
```

## f. Phased Migration Roadmap

### Phase 1: Backend DB Reads + External API Integration

**Goal:** Replace all mock data in the backend with real database queries and external API calls.

| File | Change | Dependencies |
|------|--------|-------------|
| `backend/src/services/oneInchService.ts` | NEW | `axios`, 1inch API key |
| `backend/src/services/lifiService.ts` | NEW | `axios` (no key) |
| `backend/src/services/socketService.ts` | NEW | `axios`, Socket API key |
| `backend/src/services/paraSwapService.ts` | NEW | `axios` (no key) |
| `backend/src/services/coinGeckoService.ts` | NEW | `axios`, CoinGecko API key |
| `backend/src/services/defiLlamaService.ts` | NEW | `axios` (no key) |
| `backend/src/services/rpcService.ts` | NEW | `ethers` (already installed) |
| `backend/src/services/priceService.ts` | NEW | Aggregates CG + Chainlink |
| `backend/src/services/chainMetricsService.ts` | NEW | Aggregates DeFiLlama |
| `backend/src/routes/market.ts` | REWRITE | Prisma + rpcService + defiLlamaService |
| `backend/src/routes/execution.ts` | REWRITE | Prisma + routing APIs |
| `backend/src/routes/settlement.ts` | REWRITE | Prisma + rpcService |
| `backend/src/routes/routes.ts` | REWRITE | Prisma + lifiService |
| `backend/src/routes/alerts.ts` | REWRITE | Prisma + generated alerts |
| `backend/src/index.ts` | REWRITE | Remove all inline mock data |
| `backend/src/jobs/index.ts` | NEW | BullMQ queue definitions |
| `backend/src/jobs/priceUpdate.job.ts` | NEW | CoinGecko polling |
| `backend/src/jobs/chainMetrics.job.ts` | NEW | DeFiLlama polling |
| `backend/src/jobs/alertGenerator.job.ts` | NEW | Condition-based alerts |
| `backend/prisma/schema.prisma` | ADD | TokenPrice, PoolReserve, GasPrice models |
| `backend/prisma/seed.ts` | REWRITE | Live data seeding |
| `.env` | ADD | ALCHEMY_KEY, COINGECKO_KEY, API keys |

**Estimated effort:** 5-7 days

### Phase 2: Frontend Connects to Real Backend

**Goal:** Frontend stops using mock Next.js API routes and connects to the live Fastify backend.

| File | Action |
|------|--------|
| `frontend/src/app/api/` | DELETE entire directory (21 files) |
| `frontend/src/lib/api-client.ts` | NEW centralized API client |
| `frontend/src/lib/constants.ts` | UPDATE API_BASE, add WS_URL |
| `frontend/src/stores/market-store.ts` | ADD fetchChains, fetchLiquidityPools actions |
| `frontend/src/stores/route-store.ts` | ADD fetchRoutes, simulateRoute, fetchRecommendation |
| `frontend/src/stores/alert-store.ts` | ADD fetchAlerts, markAsRead |
| `frontend/src/stores/wallet-store.ts` | ADD fetchKpis, fetchSystemHealth, remove mock connect |
| `frontend/src/stores/solver-store.ts` | ADD fetchOrders, submitExecution |
| `frontend/src/components/market-matrix/MarketMatrix.tsx` | Use store fetchChains instead of inline fetch |
| `frontend/src/components/execution-blotter/ExecutionBlotter.tsx` | Use real API calls instead of setTimeout |
| `frontend/src/components/ai-solver/AiSolver.tsx` | Use store fetchRecommendation, remove hardcoded object |
| `frontend/src/components/settlement-inspector/SettlementInspector.tsx` | Use real API data |
| `frontend/src/components/alerts-feed/AlertsFeed.tsx` | Use store fetchAlerts, remove setInterval mock |
| `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx` | Fetch from API |
| `frontend/src/components/layout/StatusStrip.tsx` | Fetch ticker from API |
| `frontend/src/hooks/useWebSocket.ts` | Remove simulation path, use real WS only |

**Estimated effort:** 3-4 days

### Phase 3: Wallet + Contract Integration

**Goal:** Users can connect real wallets, submit real transactions, and settle on-chain.

| File | Action |
|------|--------|
| `frontend/package.json` | ADD wagmi, viem, rainbowkit, @tanstack/react-query |
| `frontend/src/lib/wagmi.ts` | NEW wagmi config |
| `frontend/src/app/layout.tsx` | WRAP with WagmiProvider + RainbowKitProvider |
| `frontend/src/components/layout/WalletButton.tsx` | NEW RainbowKit ConnectButton |
| `frontend/src/stores/wallet-store.ts` | SYNC with wagmi useAccount/useBalance |
| `frontend/src/components/layout/Header.tsx` | Replace mock wallet with WalletButton |
| `frontend/src/components/execution-blotter/ExecutionBlotter.tsx` | Use useSendTransaction for execute |
| `backend/src/services/contractService.ts` | NEW ethers.js contract wrappers |
| `backend/src/services/rpcService.ts` | ADD signer management |
| `backend/src/routes/execution.ts` | ADD non-custodial calldata return mode |
| `backend/src/routes/settlement.ts` | ADD on-chain verification |
| `contracts/scripts/deploy.ts` | REVIEW/UPDATE for testnet deployment |
| `.env` | ADD DEPLOYER_KEY, deployed contract addresses |

**Estimated effort:** 5-7 days

### Phase 4: Production Hardening

**Goal:** Monitoring, caching, error handling, performance optimization.

| File | Action |
|------|--------|
| `backend/src/jobs/rpcHealthCheck.job.ts` | NEW RPC health monitoring |
| `backend/src/jobs/transactionMonitor.job.ts` | NEW tx confirmation tracking |
| `backend/src/middleware/error.ts` | ENHANCE with structured error reporting |
| `backend/src/index.ts` | ADD Sentry/Datadog APM integration |
| `backend/src/index.ts` | ADD rate limit tuning per route |
| All services | ADD retry logic with exponential backoff |
| All services | ADD circuit breaker pattern for external APIs |
| `frontend/src/components/common/ErrorBoundary.tsx` | ENHANCE with retry UI |
| `frontend/src/hooks/useWebSocket.ts` | ADD heartbeat, reconnect with jitter |
| Redis | ADD monitoring dashboard |
| BullMQ | ADD job failure alerts |
| General | ADD health check aggregation endpoint |
| General | ADD comprehensive logging (already using pino) |
| CI/CD | ADD GitHub Actions: lint → test → build → deploy |

**Estimated effort:** 3-5 days

## Summary of ALL Files That Need to Change

### Backend: 25 files
| File | Status |
|------|--------|
| `backend/src/config.ts` | ADD more env vars (API keys, contract addresses) |
| `backend/src/index.ts` | REWRITE inline routes (kpi, chains, health) |
| `backend/src/routes/market.ts` | REWRITE — replace mock chains/liquidity/ticker |
| `backend/src/routes/execution.ts` | REWRITE — real API calls + DB + calldata |
| `backend/src/routes/settlement.ts` | REWRITE — real on-chain verification |
| `backend/src/routes/routes.ts` | REWRITE — DB queries + live recommendations |
| `backend/src/routes/alerts.ts` | REWRITE — DB CRUD + generated alerts |
| `backend/src/services/oneInchService.ts` | NEW |
| `backend/src/services/lifiService.ts` | NEW |
| `backend/src/services/socketService.ts` | NEW |
| `backend/src/services/paraSwapService.ts` | NEW |
| `backend/src/services/coinGeckoService.ts` | NEW |
| `backend/src/services/defiLlamaService.ts` | NEW |
| `backend/src/services/rpcService.ts` | NEW |
| `backend/src/services/priceService.ts` | NEW |
| `backend/src/services/chainMetricsService.ts` | NEW |
| `backend/src/services/contractService.ts` | NEW |
| `backend/src/jobs/index.ts` | NEW |
| `backend/src/jobs/priceUpdate.job.ts` | NEW |
| `backend/src/jobs/chainMetrics.job.ts` | NEW |
| `backend/src/jobs/transactionMonitor.job.ts` | NEW |
| `backend/src/jobs/rpcHealthCheck.job.ts` | NEW |
| `backend/src/jobs/alertGenerator.job.ts` | NEW |
| `backend/src/websocket/handler.ts` | REWRITE — real events via Redis Pub/Sub |
| `backend/prisma/schema.prisma` | ADD TokenPrice, PoolReserve, GasPrice, PriceHistory, TransactionHistory |
| `backend/prisma/seed.ts` | REWRITE — live seeding from external APIs |

### Frontend: 25 files
| File | Status |
|------|--------|
| `frontend/src/app/api/` (21 files) | DELETE |
| `frontend/src/lib/api-client.ts` | NEW |
| `frontend/src/lib/constants.ts` | UPDATE API_BASE, add WS_URL |
| `frontend/src/lib/wagmi.ts` | NEW |
| `frontend/src/stores/market-store.ts` | ADD async fetch actions |
| `frontend/src/stores/route-store.ts` | ADD async fetch actions |
| `frontend/src/stores/alert-store.ts` | ADD async fetch actions |
| `frontend/src/stores/wallet-store.ts` | REWRITE — real wallet + API data |
| `frontend/src/stores/solver-store.ts` | ADD async fetch actions |
| `frontend/src/hooks/useWebSocket.ts` | REWRITE — remove simulation, real WS only |
| `frontend/src/app/layout.tsx` | ADD WagmiProvider+RainbowKitProvider |
| `frontend/src/components/market-matrix/MarketMatrix.tsx` | Use store actions |
| `frontend/src/components/execution-blotter/ExecutionBlotter.tsx` | Use API + wallet |
| `frontend/src/components/ai-solver/AiSolver.tsx` | Use store + remove hardcoded data |
| `frontend/src/components/settlement-inspector/SettlementInspector.tsx` | Use API |
| `frontend/src/components/alerts-feed/AlertsFeed.tsx` | Use store + remove mock |
| `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx` | Fetch from API |
| `frontend/src/components/layout/StatusStrip.tsx` | Fetch from API/WS |
| `frontend/src/components/layout/WalletButton.tsx` | NEW |
| `frontend/src/components/layout/Header.tsx` | Use WalletButton |
| `frontend/package.json` | ADD wagmi, viem, rainbowkit |
| `frontend/.env.local` | ADD NEXT_PUBLIC_API_URL, WS_URL, WalletConnect project ID |

### Contracts: 1 file
| File | Status |
|------|--------|
| `contracts/scripts/deploy.ts` | REVIEW/UPDATE for testnet deployment |

### Infrastructure: 1 file
| File | Status |
|------|--------|
| `.env.example` | ADD all required env vars with descriptions |

**Total: ~51 files to create/modify across 4 phases.**
