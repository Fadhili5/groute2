# CTO Execution Plan — Mock Data → Live APIs

**Date:** 2026-05-11
**Status:** Approved — Ready for Engineering Sprint
**Total Effort Estimate:** 16-23 days across 4 phases

---

## 1. Inventory of ALL Mock Data

### 1A. Frontend Next.js API Routes (21 files — DELETE ALL)

These are `frontend/src/app/api/` route.ts files that return hardcoded JSON to pretend a backend exists. Every one must be deleted once the frontend calls the real backend directly.

| # | File | Lines | What's Mocked |
|---|------|-------|---------------|
| 1 | `frontend/src/app/api/market/chains/route.ts` | 3-10 | Hardcoded `CHAINS` array: 6 chains with fake liquidity ($842M ETH, $456M ARB, etc.), spreads, gas (12.4 gwei ETH), bridge fees, slippage, latency, privacy scores, MEV scores, ETA, status |
| 2 | `frontend/src/app/api/market/liquidity/route.ts` | — | Hardcoded pools array with fake depth/APY/volume |
| 3 | `frontend/src/app/api/market/ticker/route.ts` | — | Hardcoded ticker items (block numbers, gas prices, route completions) |
| 4 | `frontend/src/app/api/execution/simulate/route.ts` | — | Math.random()-generated gas, bridgeFee, slippage, ETA, confidence, fragments |
| 5 | `frontend/src/app/api/execution/optimize/route.ts` | — | Math.random()-generated optimized route, gas, savings, confidence, privacy score |
| 6 | `frontend/src/app/api/execution/execute/route.ts` | 4-6, 27-33 | `generateId()` + random `txHash` (`0x` + 64 random hex chars). Body passes through with status "executing" |
| 7 | `frontend/src/app/api/execution/orders/route.ts` | — | Redis-backed but no real data ever created (no ingestion pipeline) |
| 8 | `frontend/src/app/api/execution/orders/[id]/route.ts` | — | Empty Redis lookup always returns 404 |
| 9 | `frontend/src/app/api/routes/route.ts` | — | Hardcoded 4 routes (ETH-USDC Arbitrum Express, USDT Base Solana, etc.) with fake avgLatency, successRate, totalVolume |
| 10 | `frontend/src/app/api/routes/recommend/route.ts` | — | Hardcoded recommendation object (ETH→LayerZero→Arbitrum→Uniswap V3→USDC), hardcoded confidence=94, hardcoded alternatives array |
| 11 | `frontend/src/app/api/routes/simulate/route.ts` | — | Hardcoded simulation with fragments array (wallet→split→bridge→swap→settle), totalDuration "5.1s", totalCost "$0.10" |
| 12 | `frontend/src/app/api/routes/compare/route.ts` | — | Hardcoded comparison using request params but returning fake numbers (always $842M vs $456M liquidity) |
| 13 | `frontend/src/app/api/settlement/proofs/route.ts` | — | Hardcoded 2 proof objects with fake txHash, proofHash, confirmations (32, 64), fees (12.45, 8.30) |
| 14 | `frontend/src/app/api/settlement/verify/[txHash]/route.ts` | — | Always returns `{ verified: true, block: 19876543, confirmations: 32, state: "confirmed" }` regardless of input |
| 15 | `frontend/src/app/api/settlement/inspect/route.ts` | — | `Math.random()`-generated fees, confirmations; `uuid()`-generated hashes |
| 16 | `frontend/src/app/api/alerts/route.ts` | — | Hardcoded 6 alerts (a1-a6) with fake types (route_success, mev_event, bridge_outage, gas_spike, liquidity_spike, relayer_failure) |
| 17 | `frontend/src/app/api/alerts/unread/route.ts` | — | Filters same hardcoded array by `!a.read` |
| 18 | `frontend/src/app/api/alerts/[id]/read/route.ts` | — | Mutates hardcoded in-memory array (volatile — resets on server restart) |
| 19 | `frontend/src/app/api/kpi/route.ts` | 3-9 | Hardcoded: `tvl: 847_000_000`, `volume24h: 234_000_000`, `routesExecuted: 1847`, `mevProtected: 98.5` |
| 20 | `frontend/src/app/api/system/health/route.ts` | 3-9 | Hardcoded: `network: "connected"`, `relayers: 12`, `blockHeight: 19876543`, `apiHealth: "healthy"` |
| 21 | `frontend/src/app/api/health/route.ts` | — | Mostly static with timestamp |

### 1B. Backend Routes (5 files + inline in index.ts)

| # | File | Lines | What's Mocked |
|---|------|-------|---------------|
| 22 | `backend/src/routes/market.ts` | 11-18 | `CHAINS` array — same 6 chains as frontend, identical fake values |
| 23 | `backend/src/routes/market.ts` | 34-44 | `GET /liquidity` — 8 hardcoded pools (ETH-USDC $320M, ARB-USDC $220M, SOL-USDC $410M, etc.) |
| 24 | `backend/src/routes/market.ts` | 48-58 | `GET /ticker` — 6 hardcoded items: fake block numbers, fake gas prices, fake route completion messages |
| 25 | `backend/src/routes/execution.ts` | 29-42 | `POST /simulate` — `Math.random()` for gas (0-0.01), bridgeFee (amount*0.0005), slippage, ETA (2-17s), confidence (78-98%), fragments (2-4) |
| 26 | `backend/src/routes/execution.ts` | 48-60 | `POST /optimize` — `Math.random()` for gas (0.1-5.1 gwei), savings (5-35%), confidence (88-98%), privacy (65-95), bridges always ["LayerZero", "Across"] |
| 27 | `backend/src/routes/execution.ts` | 66-82 | `POST /execute` — Random `txHash` (64 hex chars), `setTimeout` fakes status change to "completed" after 5s |
| 28 | `backend/src/routes/execution.ts` | 84-101 | `GET /orders` + `GET /orders/:id` — Redis-backed but only our fake orders exist. No real data pipeline. |
| 29 | `backend/src/routes/alerts.ts` | 10-17 | `ALERTS` array — 6 hardcoded alerts identical to frontend's (a1-a6) |
| 30 | `backend/src/routes/alerts.ts` | 27-35 | `PUT /:id/read` — Mutates in-memory array, resets on restart |
| 31 | `backend/src/routes/routes.ts` | 13-19 | `GET /` — 4 hardcoded routes with fake avgLatency, successRate (93-99%), totalVolume ($28M-$142M) |
| 32 | `backend/src/routes/routes.ts` | 22-36 | `GET /recommend` — Full hardcoded recommendation object: path, reason, confidence, bridgeHealth, alternatives, mevForecast |
| 33 | `backend/src/routes/routes.ts` | 38-53 | `GET /simulate` — Hardcoded 5-step fragment visualization with fake durations/costs |
| 34 | `backend/src/routes/routes.ts` | 55-65 | `POST /compare` — Returns hardcoded comparison strings regardless of input (always $842M vs $456M, 92 vs 88 score) |
| 35 | `backend/src/routes/settlement.ts` | 19-43 | `GET /proofs` — 2 hardcoded proof objects (confirmed + finalized) with fake txHashes, fees ($12.45, $8.30), confirmations (32, 64) |
| 36 | `backend/src/routes/settlement.ts` | 45-60 | `GET /verify/:txHash` — Always returns verified=true, block=19876543, confirmations=32 regardless of actual tx |
| 37 | `backend/src/routes/settlement.ts` | 62-77 | `POST /inspect` — `Math.random()` for fees ($5-$25), confirmations (1-64); uuid-generated fake hashes |
| 38 | `backend/src/index.ts` | 62-67 | `/api/kpi` — Hardcoded: tvl=847M, volume24h=234M, routesExecuted=1847, mevProtected=98.5 |
| 39 | `backend/src/index.ts` | 69-84 | `/api/chains` — Fallback when Prisma unavailable: hardcoded 6 chains with null rpcUrl, empty liquidityPools |
| 40 | `backend/src/index.ts` | 86-91 | `/api/system/health` — Hardcoded: network="connected", relayers=12, blockHeight=19876543 |

### 1C. WebSocket

| # | File | Lines | What's Mocked |
|---|------|-------|---------------|
| 41 | `backend/src/websocket/handler.ts` | 62-69 | `setInterval` every 3s generates fake events |
| 42 | `backend/src/websocket/handler.ts` | 74-125 | `generateEvent()` — Random channel picker, then random data per channel: random gas (0.1-50.1), random liquidity (0-1M), random execution status, random settlement state, random alert messages from array of 5 strings |

### 1D. Frontend Components with Hardcoded Data

| # | File | Lines | What's Mocked |
|---|------|-------|---------------|
| 43 | `frontend/src/components/market-matrix/MarketMatrix.tsx` | 71-78 | `CHAIN_DATA` fallback array — same hardcoded 6 chains |
| 44 | `frontend/src/components/market-matrix/MarketMatrix.tsx` | 218-227 | Fetches from frontend mock API `/api/market/chains`, falls back to hardcoded CHAIN_DATA |
| 45 | `frontend/src/components/ai-solver/AiSolver.tsx` | 7-17 | `RECOMMENDATION` object — hardcoded path, reason, alternatives, confidence=94 |
| 46 | `frontend/src/components/alerts-feed/AlertsFeed.tsx` | 26-37 | `createInitialAlerts()` — 7 hardcoded alerts |
| 47 | `frontend/src/components/alerts-feed/AlertsFeed.tsx` | 52-72 | `setInterval` every 8s pushes fake random alerts |
| 48 | `frontend/src/components/settlement-inspector/SettlementInspector.tsx` | 8-20 | `createSample()` — hardcoded single settlement |
| 49 | `frontend/src/components/settlement-inspector/SettlementInspector.tsx` | 44-48 | `handleInspect` — fake setTimeout(1.5s) instead of real API call |
| 50 | `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx` | 16-23 | `DATA` array — 6 chains with hardcoded depth/util/volume/color |
| 51 | `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx` | 25-44 | `GRID_DATA` array — 3 chains with 4 pools each, hardcoded depths and APYs |
| 52 | `frontend/src/components/layout/StatusStrip.tsx` | 7-14 | `DEFAULT_TICKER` — 6 hardcoded items |
| 53 | `frontend/src/components/watchlist/Watchlist.tsx` | 8-16 | `DEFAULT_WATCHLIST` — 7 tokens with hardcoded prices (ETH=$3452.80, BTC=$67891.20, SOL=$142.65, etc.) and 24h changes |

### 1E. Frontend Stores with Mock Initial Values

| # | File | Lines | What's Mocked |
|---|------|-------|---------------|
| 54 | `frontend/src/stores/wallet-store.ts` | 25 | `systemHealth` initial value — hardcoded network="connected", relayers=12, blockHeight=19876543 |
| 55 | `frontend/src/stores/wallet-store.ts` | 26 | `kpis` initial value — hardcoded tvl=847M, volume24h=234M, routesExecuted=1847, mevProtected=98.5 |
| 56 | `frontend/src/stores/wallet-store.ts` | 28-29 | `connect()` / `disconnect()` — Sets hardcoded address `0x742d...` and balance 100000. No real wallet integration. |

### 1F. Frontend Hook — WebSocket Simulation Fallback

| # | File | Lines | What's Mocked |
|---|------|-------|---------------|
| 57 | `frontend/src/hooks/useWebSocket.ts` | 30-49 | When `url` is falsy, runs `setInterval` (8s) that randomly perturbs gas prices of all existing chains by ±2% and randomly generates fake alerts (route_success, mev_event, gas_spike) |

### 1G. Backend Config — Demo RPC Keys

| # | File | Lines | What's Mocked |
|---|------|-------|---------------|
| 58 | `backend/src/config.ts` | 28-33 | All RPC URLs default to `.../v2/demo` Alchemy keys (except Solana and BNB). `demo` keys are rate-limited to single-user dev use. |

---

## 2. Real Data Source for Each Mock Data Point

### 2A. Chain & Market Data

| Mock Data | Field | Real Source | Endpoint | Response Mapping | Fallback |
|-----------|-------|-------------|----------|-----------------|----------|
| `chain.liquidity` | TVL per chain | DeFiLlama `/v2/chains` | `GET https://api.llama.fi/v2/chains` | `response[].tvl` → `liquidity` (convert to USD) | Cache last-known value for 5 min |
| `chain.gas` | Gas price (gwei) | RPC via `ethers.getFeeData()` | `provider.getFeeData()` → `gasPrice` | `feeData.gasPrice` → convert wei→gwei | Etherscan gas tracker API |
| `chain.bridgeFee` | Estimated bridge fee | LI.FI `/v1/quote` | `GET https://li.quest/v1/quote?fromChain=...&toChain=...&fromToken=...&toToken=...&amount=...` | `quote.estimatedGasCost` + `quote.bridgeFee` | Socket.tech API |
| `chain.slippage` | Estimated slippage | 1inch `/v5.2/{chainId}/quote` | `GET https://api.1inch.dev/swap/v5.2/{chainId}/quote?src=...&dst=...&amount=...` | `quote.estimatedGas` + slippage from price impact | ParaSwap API |
| `chain.latency` | Block time / finality | DeFiLlama `/v2/chains` | Same as TVL endpoint | Extract from chain metadata or RPC `eth_blockNumber` polling | Hardcoded defaults per chain |
| `chain.privacy` | Privacy score | Composite: MEV Blocker / Flashbots | Check Flashbots reputation, RPC privacy features | Composite score from multiple signals | Default score per chain type |
| `chain.mev` | MEV protection level | Flashbots + MEV Blocker status | Flashbots relay status, MEV Blocker API | Binary + severity from status endpoints | Default MED rating |
| `chain.eta` | Estimated time | Min(block time, bridge latency) | Computed from `chain.latency` + bridge overhead | Simple formula | Static per chain |
| `chain.status` | Chain health | RPC health check | `provider.getBlockNumber()` with timeout | Connected=false if RPC fails 3 consecutive pings | "degraded" |

### 2B. Token Prices & Watchlist

| Mock Data | Real Source | Endpoint | Response Mapping | Fallback |
|-----------|-------------|----------|-----------------|----------|
| `WatchlistItem.price` | CoinGecko pro | `GET https://pro-api.coingecko.com/api/v3/simple/price?ids=...&vs_currencies=usd&include_24hr_change=true` | `response[id].usd` → `price`, `response[id].usd_24h_change` → `change24h` | CoinGecko free tier (rate-limited, 30 req/min) |
| `WatchlistItem.pnl` | Computed from price change | Same CoinGecko response | `amount * (change24h / 100)` → `pnl` | — |
| KPI `tvl` | DeFiLlama aggregated | `GET https://api.llama.fi/v2/chains` → sum `tvl` across tracked chains | Sum of all chain TVLs | Cache 60s |
| KPI `volume24h` | DeFiLlama chain volume | Same endpoint → sum chain `volume24h` fields | Sum across tracked chains | Cache 60s |
| KPI `routesExecuted` | Prisma count | `prisma.intent.count({ where: { state: "settled", createdAt: { gte: 24h ago } } })` | Count of settled intents in 24h | — |
| KPI `mevProtected` | Computed | `(MEV-protected intents / total intents) * 100` | Percentage calculation | — |

### 2C. Liquidity Pools

| Mock Data | Real Source | Endpoint | Response Mapping | Fallback |
|-----------|-------------|----------|-----------------|----------|
| `pool.depth` | DeFiLlama pool TVL | `GET https://api.llama.fi/pools` | Filter by chain + token → `pool.tvlUsd` | 1inch token reserves |
| `pool.apy` | DefiLlama pool APY | Same pools endpoint | `pool.apy` field | Yearn/APY.vision API |
| `pool.volume24h` | DeFiLlama pool volume | Same pools endpoint | `pool.volume24h` field | — |
| `pool.utilization` | Computed | `depth / max_depth` | Simple ratio | — |

### 2D. Route Simulation & Execution

| Mock Data | Real Source | Endpoint | Response Mapping | Fallback |
|-----------|-------------|----------|-----------------|----------|
| Simulation result | 1inch Aggregator | `GET https://api.1inch.dev/swap/v5.2/{chainId}/quote?src={tokenIn}&dst={tokenOut}&amount={amount}` | `toAmount`, `estimatedGas`, `protocols` | LI.FI |
| Simulation result | LI.FI | `GET https://li.quest/v1/quote?fromChain={chainId}&toChain={chainId}&fromToken={address}&toToken={address}&amount={amount}` | `estimate.gasCosts`, `estimate.feeCosts`, `transactionRequest` | Socket.tech |
| Simulation result | ParaSwap | `GET https://api.paraswap.io/prices/?srcToken={address}&destToken={address}&amount={amount}&srcDecimals=...&destDecimals=...&side=SELL` | `priceRoute.gasCostUSD`, `priceRoute.srcAmount`, `priceRoute.destAmount` | — |
| Optimize result | Multi-API aggregate | Run parallel: 1inch + LI.FI + Socket + ParaSwap → score by gas+cost+privacy | Pick best by weighted scoring | — |
| Execution calldata | 1inch or LI.FI swap endpoint | `GET https://api.1inch.dev/swap/v5.2/{chainId}/swap?src=...&dst=...&amount=...&from=...&slippage=...` | `tx.data`, `tx.to`, `tx.value` | ParaSwap |

### 2E. Settlement Verification

| Mock Data | Real Source | Endpoint | Response Mapping | Fallback |
|-----------|-------------|----------|-----------------|----------|
| Settlement proofs | Prisma + on-chain RPC | `prisma.settlement.findMany()` + `provider.getTransactionReceipt(txHash)` | Receipt fields: `blockNumber`, `confirmations`, `status` | Block explorer API (Etherscan) |
| Verify tx | RPC `getTransactionReceipt` | `provider.getTransactionReceipt(txHash)` | `receipt.status`, `receipt.blockNumber`, `receipt.confirmations` | Etherscan `/api?module=transaction&action=gettxreceiptstatus` |
| Inspect result | Prisma + RPC cross-reference | `prisma.settlement.findFirst({ where: { OR: [{txHash}, {routeId}] } })` + on-chain check | Merged DB + on-chain state | — |

### 2F. Alerts

| Mock Data | Real Source | Trigger | Generation Method |
|-----------|-------------|---------|-------------------|
| `alert.type: gas_spike` | RPC gas price monitoring | BullMQ job every 15s | Compare current gas vs 5-min rolling average; if >50% spike → create Alert |
| `alert.type: mev_event` | Flashbots/MEV Blocker API | BullMQ job every 30s | Poll MEV Blocker status API; new MEV activity → create Alert |
| `alert.type: bridge_outage` | LI.FI bridge status | BullMQ job every 60s | Check bridge status endpoints; delays → create Alert |
| `alert.type: route_success` | Settlement events | On settlement completion | When `prisma.settlement.state` → "confirmed", emit Alert |
| `alert.type: relayer_failure` | Prisma relayer heartbeats | BullMQ job every 30s | Check `prisma.relayer.lastHeartbeat`; if >5min stale → create Alert |
| `alert.type: liquidity_spike` | DeFiLlama pool changes | BullMQ job every 120s | Compare current pool TVL vs last snapshot; >10% change → create Alert |

### 2G. System Health

| Mock Data | Real Source | Method |
|-----------|-------------|--------|
| `systemHealth.network` | RPC connectivity | `Promise.all(chains.map(c => provider.getBlockNumber().then(...).catch(...)))` |
| `systemHealth.relayers` | Prisma count | `prisma.relayer.count({ where: { status: "active" } })` |
| `systemHealth.blockHeight` | RPC latest block | `provider.getBlockNumber()` for main chain (ETH) |
| `systemHealth.apiHealth` | Upstream health checks | Ping CoinGecko, DeFiLlama, 1inch endpoints with timeout |

---

## 3. Implementation Order (Priority Queue)

### P0 — Must Do First (Days 1-3)
**Goal: Market Matrix shows real chain data, gas prices, TVL, and token prices.**

| Task | Files | Depends On |
|------|-------|------------|
| 0.1 | Create `backend/src/services/rpcService.ts` | RPC URLs in .env |
| 0.2 | Create `backend/src/services/coinGeckoService.ts` | CoinGecko API key |
| 0.3 | Create `backend/src/services/defiLlamaService.ts` | Nothing (free API) |
| 0.4 | Create `backend/src/services/chainMetricsService.ts` | rpcService, defiLlamaService |
| 0.5 | Rewrite `backend/src/routes/market.ts` (chains + ticker) | chainMetricsService, coinGeckoService, rpcService |
| 0.6 | Fix `backend/src/index.ts` /api/kpi and /api/system/health | chainMetricsService, prisma |
| 0.7 | Update `backend/src/config.ts` with real RPC URL structure | — |
| 0.8 | Update `.env.example` + `.env` with required keys | — |
| 0.9 | Rewrite `backend/src/routes/market.ts` (liquidity endpoint) | defiLlamaService |

### P1 — Route Quotes & Simulation (Days 4-6)
**Goal: Execution Blotter returns real quotes, simulations, and route data.**

| Task | Files | Depends On |
|------|-------|------------|
| 1.1 | Create `backend/src/services/oneInchService.ts` | 1inch API key |
| 1.2 | Create `backend/src/services/lifiService.ts` | Nothing (free) |
| 1.3 | Create `backend/src/services/socketService.ts` | Socket API key |
| 1.4 | Create `backend/src/services/paraSwapService.ts` | Nothing (free) |
| 1.5 | Create `backend/src/services/priceService.ts` | coinGeckoService |
| 1.6 | Rewrite `backend/src/routes/execution.ts` (simulate + optimize) | 1inch, LI.FI, ParaSwap, Socket services |
| 1.7 | Rewrite `backend/src/routes/execution.ts` (execute) | Same routing services |
| 1.8 | Rewrite `backend/src/routes/routes.ts` (recommend + compare) | lifiService, priceService, prisma |

### P2 — Wallet Connection & Transaction Submission (Days 7-9)
**Goal: Users connect real wallets via RainbowKit and submit real transactions.**

| Task | Files | Depends On |
|------|-------|------------|
| 2.1 | Create `frontend/src/lib/wagmi.ts` | wagmi + rainbowkit packages installed |
| 2.2 | Update `frontend/src/app/layout.tsx` with providers | wagmi config |
| 2.3 | Create `frontend/src/components/layout/WalletButton.tsx` | rainbowkit |
| 2.4 | Update `frontend/src/components/layout/Header.tsx` | WalletButton |
| 2.5 | Rewrite `frontend/src/stores/wallet-store.ts` (remove mock connect, sync with wagmi) | wagmi hooks |
| 2.6 | Create `frontend/src/lib/api-client.ts` | Nothing |
| 2.7 | Update `frontend/src/lib/constants.ts` with API_BASE + WS_URL | — |
| 2.8 | Rewrite `ExecutionBlotter.tsx` handleExecute with useSendTransaction | P1, wallet connection |

### P3 — Settlement Verification & Full DB Integration (Days 10-12)
**Goal: Settlement Inspector verifies real on-chain data; Prisma tracks intent lifecycle.**

| Task | Files | Depends On |
|------|-------|------------|
| 3.1 | Create `backend/src/services/contractService.ts` | Contract ABIs, deployed addresses |
| 3.2 | Rewrite `backend/src/routes/settlement.ts` (proofs + verify + inspect) | rpcService, contractService, prisma |
| 3.3 | Update Prisma schema (add TokenPrice, PoolReserve, GasPrice, PriceHistory, TransactionHistory) | — |
| 3.4 | Run `prisma migrate dev` | Schema changes |
| 3.5 | Rewrite `backend/prisma/seed.ts` | coinGeckoService, defiLlamaService |
| 3.6 | Implement BullMQ jobs (basic: priceUpdate, chainMetrics) | Redis |

### P4 — WebSocket, Alerts, and Production Hardening (Days 13-16+)
**Goal: Real-time events, intelligent alerts, monitoring, and error handling.**

| Task | Files | Depends On |
|------|-------|------------|
| 4.1 | Rewrite `backend/src/websocket/handler.ts` (Redis Pub/Sub pattern) | BullMQ queue events, rpcService |
| 4.2 | Implement BullMQ alertGenerator job | prisma, rpcService |
| 4.3 | Create `backend/src/jobs/transactionMonitor.job.ts` | contractService, prisma |
| 4.4 | Create `backend/src/jobs/rpcHealthCheck.job.ts` | rpcService |
| 4.5 | Update `frontend/src/hooks/useWebSocket.ts` (remove simulation path) | Real backend WS |
| 4.6 | Update all frontend components to use store async actions | api-client |
| 4.7 | Delete `frontend/src/app/api/` directory (21 files) | All P0-P3 complete |
| 4.8 | Add circuit breakers, retry logic, error boundaries | — |

---

## 4. File-by-File Rewrite Instructions

### 4.0 — Prerequisites Before Any Rewrites

**Environment variables to configure (`.env` in backend/):**
```env
# RPC Endpoints (replace "demo" with real Alchemy/Infura keys)
ETH_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
ARB_RPC=https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
SOL_RPC=<solana-rpc-url>
AVAX_RPC=https://avax-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BNB_RPC=https://bsc-dataseed1.binance.org

# External API Keys
COINGECKO_API_KEY=your_coingecko_pro_key    # Required for price feed
ONEINCH_API_KEY=your_1inch_api_key           # Required for swap quotes
SOCKET_API_KEY=your_socket_tech_key          # Optional, fallback only

# WalletConnect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wc_project_id

# Contract Addresses (from deployment)
INTENT_ROUTER=0x...
FRAGMENT_VAULT=0x...
ROUTE_REGISTRY=0x...
SETTLEMENT_VERIFIER=0x...

# Redis (already configured)
REDIS_URL=redis://localhost:6379
```

### 4.1 — File: `backend/src/config.ts` (UPDATE)

**What to change:**
- Replace all `|| ".../v2/demo"` RPC URL defaults with validated env vars
- Add new config sections for API keys
- Add Solana RPC endpoint (separate from EVM RPCs since ethers.js ≠ Solana)

**Delete lines 28-33. Replace with:**
```typescript
rpc: {
  ethereum: requiredEnv('ETH_RPC'),
  arbitrum: requiredEnv('ARB_RPC'),
  base: requiredEnv('BASE_RPC'),
  solana: requiredEnv('SOL_RPC'),
  avalanche: requiredEnv('AVAX_RPC'),
  bnb: process.env.BNB_RPC || 'https://bsc-dataseed1.binance.org',
},
apiKeys: {
  coinGecko: requiredEnv('COINGECKO_API_KEY'),
  oneInch: process.env.ONEINCH_API_KEY || '',
  socket: process.env.SOCKET_API_KEY || '',
},
solana: {
  rpcUrl: requiredEnv('SOL_RPC'),
},
```

**New dependencies needed:** None (already uses `dotenv`)

---

### 4.2 — NEW FILE: `backend/src/services/rpcService.ts`

**Full implementation.** Use ethers.js for EVM chains, `@solana/web3.js` for Solana.

```typescript
import { ethers } from 'ethers';
import { Connection } from '@solana/web3.js';
import { config } from '../config.js';

const evmProviders = new Map<number, ethers.JsonRpcProvider>();
let solanaConnection: Connection | null = null;

const EVM_RPC_MAP: Record<number, string> = {
  1: config.rpc.ethereum,
  42161: config.rpc.arbitrum,
  8453: config.rpc.base,
  43114: config.rpc.avalanche,
  56: config.rpc.bnb,
};

export function getEvmProvider(chainId: number): ethers.JsonRpcProvider {
  if (!evmProviders.has(chainId)) {
    evmProviders.set(chainId, new ethers.JsonRpcProvider(EVM_RPC_MAP[chainId], chainId, {
      staticNetwork: true,
    }));
  }
  return evmProviders.get(chainId)!;
}

export function getSolanaConnection(): Connection {
  if (!solanaConnection) {
    solanaConnection = new Connection(config.rpc.solana, 'confirmed');
  }
  return solanaConnection;
}

export async function getGasPrice(chainId: number): Promise<{ slow: number; standard: number; fast: number }> {
  const provider = getEvmProvider(chainId);
  const feeData = await provider.getFeeData();
  const base = Number(feeData.gasPrice ?? 0n) / 1e9;
  return {
    slow: base * 0.9,
    standard: base,
    fast: base * 1.2,
  };
}

export async function getLatestBlock(chainId: number): Promise<number> {
  const provider = getEvmProvider(chainId);
  return provider.getBlockNumber();
}

export async function getTransactionReceipt(txHash: string, chainId: number) {
  const provider = getEvmProvider(chainId);
  return provider.getTransactionReceipt(txHash);
}

export async function checkRpcHealth(chainId: number): Promise<boolean> {
  try {
    const provider = getEvmProvider(chainId);
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}
```

**New dependency:** `"@solana/web3.js": "^2.0.0"`

---

### 4.3 — NEW FILE: `backend/src/services/coinGeckoService.ts`

```typescript
import axios from 'axios';
import { config } from '../config.js';

const BASE_URL = 'https://pro-api.coingecko.com/api/v3';
const FREE_URL = 'https://api.coingecko.com/api/v3';

const client = axios.create({
  baseURL: config.apiKeys.coinGecko ? BASE_URL : FREE_URL,
  params: config.apiKeys.coinGecko ? { x_cg_pro_api_key: config.apiKeys.coinGecko } : {},
  timeout: 10000,
});

const TOKEN_IDS: Record<string, string> = {
  ETH: 'ethereum', USDC: 'usd-coin', USDT: 'tether',
  BTC: 'bitcoin', SOL: 'solana', AVAX: 'avalanche-2',
  BNB: 'binancecoin', ARB: 'arbitrum', DAI: 'dai',
};

export async function getTokenPrices(symbols: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  const ids = symbols.map(s => TOKEN_IDS[s.toLowerCase()]).filter(Boolean).join(',');
  if (!ids) return {};
  const { data } = await client.get('/simple/price', {
    params: { ids, vs_currencies: 'usd', include_24hr_change: true },
  });
  const result: Record<string, { usd: number; usd_24h_change: number }> = {};
  for (const [id, vals] of Object.entries(data)) {
    const symbol = Object.entries(TOKEN_IDS).find(([, v]) => v === id)?.[0];
    if (symbol) result[symbol] = vals as any;
  }
  return result;
}

export async function getMarketChart(symbol: string, days: number = 7) {
  const id = TOKEN_IDS[symbol.toUpperCase()];
  if (!id) throw new Error(`Unknown token: ${symbol}`);
  const { data } = await client.get(`/coins/${id}/market_chart`, {
    params: { vs_currency: 'usd', days },
  });
  return data;
}
```

**New dependency:** `"axios": "^1.7.0"` (check if already installed)

---

### 4.4 — NEW FILE: `backend/src/services/defiLlamaService.ts`

```typescript
import axios from 'axios';

const client = axios.create({ baseURL: 'https://api.llama.fi', timeout: 15000 });

export async function getChains() {
  const { data } = await client.get('/v2/chains');
  return data as Array<{
    chainId: number;
    name: string;
    tvl: number;
    volume24h: number;
    fees24h: number;
    gecko_id: string;
  }>;
}

export async function getChainTvl(chainName: string): Promise<number> {
  const chains = await getChains();
  const chain = chains.find(c => c.name.toLowerCase() === chainName.toLowerCase());
  return chain?.tvl ?? 0;
}

export async function getPools() {
  const { data } = await client.get('/pools');
  return data as Array<{
    pool: string;
    chain: string;
    project: string;
    symbol: string;
    tvlUsd: number;
    apy: number;
    volumeUsd1d: number;
  }>;
}

export async function getPoolByChain(chainName: string) {
  const pools = await getPools();
  return pools.filter(p => p.chain.toLowerCase() === chainName.toLowerCase());
}
```

**No new dependencies** (uses axios, already in 4.3).

---

### 4.5 — REWRITE: `backend/src/routes/market.ts`

**Delete:**
- Lines 11-18 (hardcoded CHAINS array)
- Lines 34-44 (hardcoded liquidity pools)
- Lines 48-58 (hardcoded ticker)

**Add:**
- Import `chainMetricsService`, `rpcService`, `defiLlamaService`, `coinGeckoService`
- `GET /chains` — Read from Prisma, call `rpcService.getGasPrice()` per chain, `defiLlamaService.getChainTvl()`, `coinGeckoService.getTokenPrices()`. Merge into response shape.
- `GET /chains/:id` — Same but filtered
- `GET /liquidity` — Call `defiLlamaService.getPoolByChain()`, transform to existing pool shape
- `GET /ticker` — Aggregate: recent settlements, gas changes, RPC health events

**Pseudocode for GET /chains:**
```typescript
app.get("/chains", async (request, reply) => {
  const dbChains = await opts.prisma.chain.findMany();
  const tokenPrices = await coinGeckoService.getTokenPrices(["ETH", "ARB", ...]);
  const llamaChains = await defiLlamaService.getChains();
  
  const chains = await Promise.all(dbChains.map(async (c) => {
    const gasPromise = rpcService.getGasPrice(c.chainId).catch(() => ({ standard: 0 }));
    const llamaChain = llamaChains.find(l => l.chainId === c.chainId);
    const gas = await gasPromise;
    return {
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      chainId: c.chainId,
      liquidity: llamaChain?.tvl ?? 0,
      spread: 0.02, // Derived from DEX pool data
      gas: gas.standard,
      bridgeFee: 0.05, // From LI.FI estimates
      slippage: 0.01, // From 1inch quote
      latency: c.chainId === 1 ? 12 : c.chainId === 42161 ? 3 : 5,
      privacy: PRIVACY_SCORES[c.chainId] ?? 50,
      mev: MEV_SCORES[c.chainId] ?? 50,
      eta: `${ETA_MAP[c.chainId] ?? 10}s`,
      status: await rpcService.checkRpcHealth(c.chainId) ? "healthy" : "degraded",
    };
  }));
  
  return { chains };
});
```

Add constants for privacy/MEV scores per chain (these are subjective metadata, not live).

---

### 4.6 — REWRITE: `backend/src/routes/execution.ts`

**Delete:**
- Lines 29-42 (random simulate)
- Lines 48-60 (random optimize)
- Lines 66-82 (fake execute with setTimeout)
- Lines 84-101 (empty Redis orders)

**Add:**
- Import `oneInchService`, `lifiService`, `socketService`, `paraSwapService`
- `POST /simulate` — Call all 4 aggregators in parallel with `Promise.any()`. Return first successful response mapped to existing shape.
- `POST /optimize` — Call all 4, score responses, return best + alternatives.
- `POST /execute` — For custodial: call contract. For non-custodial: return calldata. Save intent to Prisma.
- `GET /orders` — `prisma.intent.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })`

**Pseudocode for POST /simulate:**
```typescript
app.post("/simulate", async (request, reply) => {
  const data = simulateSchema.parse(request.body);
  const params = { ...data, amount: BigInt(data.amount) };
  
  const results = await Promise.any([
    oneInchService.getQuote(params),
    lifiService.getQuote(params),
    socketService.getQuote(params),
    paraSwapService.getQuote(params),
  ]);
  
  return {
    id: uuid(),
    gas: results.estimatedGas,
    bridgeFee: results.estimatedBridgeFee,
    slippage: results.estimatedSlippage,
    eta: results.estimatedTime,
    confidence: results.confidence,
    fragments: results.steps?.length ?? 1,
    route: results.description,
    fee: results.totalFee,
  };
});
```

---

### 4.7 — REWRITE: `backend/src/routes/settlement.ts`

**Delete:**
- Lines 19-43 (hardcoded proofs)
- Lines 48-59 (fake verify)
- Lines 65-77 (random inspect)

**Add:**
- `GET /proofs` — `prisma.settlement.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })`
- `GET /verify/:txHash` — `rpcService.getTransactionReceipt(txHash)` + verify event logs
- `POST /inspect` — Prisma lookup by txHash or routeId + optional on-chain cross-reference

---

### 4.8 — REWRITE: `backend/src/routes/alerts.ts`

**Delete:**
- Lines 10-17 (hardcoded ALERTS array)
- Lines 27-35 (in-memory mutation)

**Add:**
- `GET /` — `prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })`
- `GET /unread` — `prisma.alert.findMany({ where: { read: false } })`
- `PUT /:id/read` — `prisma.alert.update({ where: { id }, data: { read: true } })`
- Keep the BullMQ `alertGenerator.job.ts` to create real alerts

---

### 4.9 — REWRITE: `backend/src/routes/routes.ts`

**Delete:**
- Lines 13-19 (hardcoded routes)
- Lines 22-36 (hardcoded recommend)
- Lines 38-53 (hardcoded simulate)
- Lines 55-65 (hardcoded compare)

**Add:**
- `GET /` — Query `prisma.route.findMany()` with source/dest chain relations
- `GET /recommend` — Call lifiService to find best route for common pairs
- `GET /simulate` — Same as execution/simulate but returns visualization format
- `POST /compare` — Compare two chains using defiLlamaService + rpcService

---

### 4.10 — FIX: `backend/src/index.ts`

**Delete/Replace:**
- Lines 62-67 (`/api/kpi`) — Replace with:
  ```typescript
  app.get("/api/kpi", async () => {
    const chains = await defiLlamaService.getChains();
    const totalTvl = chains.reduce((s, c) => s + (c.tvl || 0), 0);
    const volume24h = chains.reduce((s, c) => s + (c.volume24h || 0), 0);
    const routesExecuted = prisma ? await prisma.intent.count({
      where: { state: "settled", createdAt: { gte: new Date(Date.now() - 86400000) } }
    }) : 0;
    return { tvl: totalTvl, volume24h, routesExecuted, mevProtected: 98.5 };
  });
  ```
- Lines 69-84 (`/api/chains`) — Remove the hardcoded fallback. If Prisma fails, return error, not mock data.
- Lines 86-91 (`/api/system/health`) — Replace with:
  ```typescript
  app.get("/api/system/health", async () => {
    const chains = [1, 42161, 8453, 43114, 56];
    const healthResults = await Promise.allSettled(chains.map(c => rpcService.checkRpcHealth(c)));
    const connected = healthResults.filter(r => r.status === "fulfilled" && r.value).length;
    const relayers = prisma ? await prisma.relayer.count({ where: { status: "active" } }) : 0;
    const blockHeight = await getLatestBlock(1).catch(() => 0);
    return { network: connected > 2 ? "connected" : "degraded", relayers, blockHeight, apiHealth: "healthy" };
  });
  ```

---

### 4.11 — NEW FILE: `backend/src/services/oneInchService.ts`

```typescript
import axios from 'axios';
import { config } from '../config.js';

const BASE_URL = 'https://api.1inch.dev/swap/v5.2';

export async function getQuote(params: {
  chainId: number;
  src: string;
  dst: string;
  amount: bigint;
}) {
  const { data } = await axios.get(`${BASE_URL}/${params.chainId}/quote`, {
    headers: { Authorization: `Bearer ${config.apiKeys.oneInch}` },
    params: {
      src: params.src,
      dst: params.dst,
      amount: params.amount.toString(),
    },
    timeout: 10000,
  });
  return {
    toAmount: data.toAmount,
    estimatedGas: Number(data.estimatedGas) / 1e9,
    estimatedBridgeFee: 0, // 1inch is single-chain
    estimatedSlippage: 0.01,
    estimatedTime: '15s',
    confidence: 95,
    steps: data.protocols?.map((p: any) => ({ name: p.name, portion: p.part })),
    description: `${params.src} → ${params.dst} (1inch)`,
    totalFee: Number(data.estimatedGas) * Number(data.gasPrice) / 1e18,
  };
}

export async function getSwapCalldata(params: {
  chainId: number; src: string; dst: string; amount: bigint;
  from: string; slippage: number;
}) {
  const { data } = await axios.get(`${BASE_URL}/${params.chainId}/swap`, {
    headers: { Authorization: `Bearer ${config.apiKeys.oneInch}` },
    params: { ...params, amount: params.amount.toString(), slippage: params.slippage },
    timeout: 15000,
  });
  return { to: data.tx.to, data: data.tx.data, value: data.tx.value };
}
```

**New dependency:** None (axios already)

---

### 4.12 — NEW FILE: `backend/src/services/lifiService.ts`

```typescript
import axios from 'axios';

const BASE_URL = 'https://li.quest/v1';

export async function getQuote(params: {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
}) {
  const { data } = await axios.get(`${BASE_URL}/quote`, {
    params: {
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
    },
    timeout: 15000,
  });
  return {
    toAmount: data.estimate.toAmount,
    estimatedGas: Number(data.estimate.gasCosts?.[0]?.amount ?? 0),
    estimatedBridgeFee: Number(data.estimate.feeCosts?.[0]?.amount ?? 0),
    estimatedSlippage: data.estimate.slippage ?? 0.01,
    estimatedTime: `${data.estimate.executionDuration}s`,
    confidence: (data.estimate.quoteScore ?? 0) * 100,
    steps: data.includedSteps?.map((s: any) => s.tool),
    description: `${params.fromToken} → ${params.toToken} via LI.FI`,
    totalFee: Number(data.estimate.gasCosts?.[0]?.amountUSD ?? 0) + Number(data.estimate.feeCosts?.[0]?.amountUSD ?? 0),
    transactionRequest: data.transactionRequest,
  };
}
```

---

### 4.13 — NEW FILE: `backend/src/services/paraSwapService.ts`

```typescript
import axios from 'axios';

const BASE_URL = 'https://api.paraswap.io';

export async function getPrice(params: {
  srcToken: string; destToken: string; amount: string;
  srcDecimals: number; destDecimals: number;
}) {
  const { data } = await axios.get(`${BASE_URL}/prices/`, {
    params: { ...params, side: 'SELL', network: 1 },
    timeout: 10000,
  });
  return {
    toAmount: data.priceRoute.destAmount,
    estimatedGas: Number(data.priceRoute.gasCostUSD),
    estimatedBridgeFee: 0,
    estimatedSlippage: data.priceRoute.side === 'SELL'
      ? (1 - Number(data.priceRoute.destAmount) / Number(data.priceRoute.srcAmount)) * 100
      : 0.01,
    estimatedTime: '20s',
    confidence: 92,
    steps: data.priceRoute.bestRoute?.map((r: any) => r.provider),
    description: `ParaSwap: ${params.srcToken} → ${params.destToken}`,
    totalFee: Number(data.priceRoute.gasCostUSD),
  };
}
```

---

### 4.14 — NEW FILE: `backend/src/services/socketService.ts`

```typescript
import axios from 'axios';
import { config } from '../config.js';

const BASE_URL = 'https://api.socket.tech/v2';

export async function getQuote(params: {
  fromChainId: number; toChainId: number;
  fromTokenAddress: string; toTokenAddress: string;
  amount: string; userAddress: string;
}) {
  const { data } = await axios.get(`${BASE_URL}/quote`, {
    headers: { 'API-KEY': config.apiKeys.socket },
    params: { ...params, singleTx: true },
    timeout: 15000,
  });
  return {
    toAmount: data.result.toAmount,
    estimatedGas: Number(data.result.gasFees?.gasLimit ?? 0),
    estimatedBridgeFee: Number(data.result.route?.bridgeFee ?? 0),
    estimatedSlippage: Number(data.result.route?.maxSlippage ?? 0.01),
    estimatedTime: `${data.result.time ?? 20}s`,
    confidence: 90,
    steps: data.result.route?.steps?.map((s: any) => s.tool),
    description: data.result.route?.name ?? 'Socket route',
    totalFee: Number(data.result.totalGasFeesInUsd ?? 0) + Number(data.result.bridgeFeeInUsd ?? 0),
  };
}
```

---

### 4.15 — Frontend: DELETE `frontend/src/app/api/` directory

**All 21 files.** Once the backend serves real data on port 3001 and the frontend's `api-client.ts` calls `localhost:3001`, these are dead code.

**Keep one file for transition** — `frontend/src/app/api/health/route.ts` can stay temporarily for Vercel health checks, but should forward to the backend eventually.

---

### 4.16 — NEW FILE: `frontend/src/lib/api-client.ts`

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `API error: ${res.status}`);
    }
    return res.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }
}

export const api = new ApiClient(API_BASE);
```

---

### 4.17 — UPDATE: `frontend/src/stores/market-store.ts`

**Add async actions to current state:**
```typescript
import { api } from '@/lib/api-client';

interface MarketState {
  chains: Chain[];
  loading: boolean;
  error: string | null;
  setChains: (chains: Chain[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchChains: () => Promise<void>;
  fetchLiquidityPools: () => Promise<void>;
}
```

Add to `create`:
```typescript
fetchChains: async () => {
  set({ loading: true, error: null });
  try {
    const data = await api.get<{ chains: Chain[] }>('/api/market/chains');
    set({ chains: data.chains, loading: false });
  } catch (e) {
    set({ error: (e as Error).message, loading: false });
  }
},
fetchLiquidityPools: async () => {
  // similar pattern
},
```

---

### 4.18 — UPDATE: `frontend/src/stores/wallet-store.ts`

**Delete:**
- Line 25: `systemHealth: { network: "connected", relayers: 12, blockHeight: 19876543, apiHealth: "healthy" }`
- Line 26: `kpis: { tvl: 847_000_000, volume24h: 234_000_000, routesExecuted: 1847, mevProtected: 98.5 }`
- Line 28: `connect: () => set({ connected: true, address: "0x742d...", balance: 100000 })`
- Line 29: `disconnect: () => set({ connected: false, address: null, balance: 0 })`

**Replace with:**
```typescript
import { api } from '@/lib/api-client';

// Add these to WalletState:
fetchKpis: () => Promise<void>;
fetchSystemHealth: () => Promise<void>;

// Remove from initial state:
// connected, address, balance — these come from wagmi now

// Initial values:
systemHealth: { network: "disconnected", relayers: 0, blockHeight: 0, apiHealth: "unknown" },
kpis: { tvl: 0, volume24h: 0, routesExecuted: 0, mevProtected: 0 },

// Actions:
fetchKpis: async () => {
  const kpis = await api.get<KPI>('/api/kpi');
  set({ kpis });
},
fetchSystemHealth: async () => {
  const systemHealth = await api.get<SystemHealth>('/api/system/health');
  set({ systemHealth });
},
```

Remove the `connect`/`disconnect` methods entirely — wallet state is now managed by wagmi and synced via a wrapper component.

---

### 4.19 — UPDATE: `frontend/src/stores/alert-store.ts` & `route-store.ts` & `solver-store.ts`

**alert-store.ts** — Add:
```typescript
fetchAlerts: async () => {
  const data = await api.get<{ alerts: Alert[] }>('/api/alerts');
  set({ alerts: data.alerts });
},
markAsRead: async (id: string) => {
  await api.put(`/api/alerts/${id}/read`, {});
  set((s) => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, read: true } : a) }));
},
```

**route-store.ts** — Add:
```typescript
fetchRoutes: async () => {
  const data = await api.get<{ routes: Route[] }>('/api/routes');
  set({ routes: data.routes, loading: false });
},
simulateRoute: async (params: SimulationParams) => {
  const data = await api.post<RouteVisualization>('/api/routes/simulate', params);
  set({ activeRoute: data });
},
fetchRecommendation: async () => {
  const data = await api.get<{ recommended: AIRecommendation }>('/api/routes/recommend');
  set({ aiRecommendation: data.recommended });
},
```

**solver-store.ts** — Add:
```typescript
fetchOrders: async () => {
  const data = await api.get<{ orders: ExecutionOrder[] }>('/api/execution/orders');
  set({ orders: data.orders });
},
submitExecution: async (params: ExecutionParams) => {
  const order = await api.post<ExecutionOrder>('/api/execution/execute', params);
  set((s) => ({ orders: [...s.orders, order] }));
},
```

---

### 4.20 — UPDATE: `frontend/src/components/market-matrix/MarketMatrix.tsx`

**Delete:**
- Lines 71-78 (CHAIN_DATA hardcoded fallback)
- Lines 218-231 (inline fetch with fallback)

**Replace with:**
```typescript
import { useMarketStore } from "@/stores";

// At top of MarketMatrix function:
const { chains: rowData, loading, error, fetchChains } = useMarketStore();
const [selectedChain, setSelectedChain] = useState<Chain | null>(null);

useEffect(() => { fetchChains(); }, [fetchChains]);

// Remove the load function and setInterval
// The 30s refresh should come from WebSocket or a setInterval calling fetchChains
```

---

### 4.21 — UPDATE: `frontend/src/components/execution-blotter/ExecutionBlotter.tsx`

**Delete:**
- Lines 24-43 (setTimeout-based mock handlers)

**Replace with real API calls:**
```typescript
import { api } from '@/lib/api-client';

const handleSimulate = async () => {
  setStatus("simulating");
  try {
    const result = await api.post('/api/execution/simulate', {
      sourceAsset, destinationAsset, sourceChain, destChain,
      amount: parseFloat(amount), privacyMode, fragmentationMode,
      slippageTolerance: parseFloat(slippage), bridgePreference: bridge, mevGuard,
    });
    setStatus("simulated");
    // Store result for execution
  } catch {
    setStatus(null);
  }
};

const handleOptimize = async () => {
  setStatus("optimizing");
  try {
    const result = await api.post('/api/execution/optimize', { ... });
    setStatus("optimized");
  } catch {
    setStatus(null);
  }
};

const handleExecute = async () => {
  setStatus("executing");
  try {
    const result = await api.post('/api/execution/execute', { ... });
    if (result.to && result.data) {
      // Non-custodial: sign with wagmi
      const tx = await sendTransactionAsync({ to: result.to, data: result.data, value: BigInt(result.value || 0) });
      setStatus(`submitted: ${tx}`);
    } else {
      setStatus("completed");
    }
  } catch {
    setStatus(null);
  }
};
```

---

### 4.22 — UPDATE: `frontend/src/components/ai-solver/AiSolver.tsx`

**Delete:**
- Lines 7-17 (hardcoded RECOMMENDATION object)
- Line 20: `const [rec] = useState(RECOMMENDATION);`

**Replace with:**
```typescript
import { useRouteStore } from "@/stores";
import { useEffect } from "react";

export function AiSolver() {
  const { aiRecommendation, fetchRecommendation, loading } = useRouteStore();
  
  useEffect(() => { fetchRecommendation(); }, [fetchRecommendation]);
  
  if (!aiRecommendation) {
    return <div className="panel ..."><span className="text-[11px] text-surface-600 font-mono animate-pulse">Loading...</span></div>;
  }
  
  const rec = aiRecommendation;
  // Rest of template stays the same, uses `rec` instead of useState
```

---

### 4.23 — UPDATE: `frontend/src/components/alerts-feed/AlertsFeed.tsx`

**Delete:**
- Lines 26-37 (createInitialAlerts function)
- Lines 46-50 (setAlerts on empty)
- Lines 52-72 (8s random alert generator)

**Replace:**
- In the component, call `fetchAlerts()` from the store on mount
- Subscribe to WebSocket alerts channel for real-time
- Remove the setInterval entirely

```typescript
import { useAlertStore } from "@/stores";

export function AlertsFeed() {
  const [mounted, setMounted] = useState(false);
  const { alerts, markAlertRead, fetchAlerts } = useAlertStore();
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  // WebSocket subscription for new alerts happens in useWebSocket hook
```

---

### 4.24 — UPDATE: `frontend/src/components/settlement-inspector/SettlementInspector.tsx`

**Delete:**
- Lines 8-20 (createSample function)
- Line 39: `const [settlement] = useState<SettlementData>(() => createSample());`
- Line 47: `setTimeout(() => setLoading(false), 1500);`

**Replace with:**
```typescript
import { api } from '@/lib/api-client';

export function SettlementInspector() {
  const [mounted, setMounted] = useState(false);
  const [txInput, setTxInput] = useState("");
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [proofs, setProofs] = useState<SettlementData[]>([]);

  useEffect(() => { setMounted(true); }, []);
  
  useEffect(() => {
    api.get<{ proofs: SettlementData[] }>('/api/settlement/proofs')
      .then(data => { setProofs(data.proofs); if (data.proofs.length > 0) setSettlement(data.proofs[0]); })
      .catch(() => {});
  }, []);

  const handleInspect = async () => {
    if (!txInput.trim()) return;
    setLoading(true);
    try {
      const data = await api.post<{ settlement: SettlementData }>('/api/settlement/inspect', { txHash: txInput });
      setSettlement(data.settlement);
    } catch { /* handle error */ }
    setLoading(false);
  };
```

---

### 4.25 — UPDATE: `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx`

**Delete:**
- Lines 16-23 (hardcoded DATA array)
- Lines 25-44 (hardcoded GRID_DATA array)

**Replace with:**
```typescript
import { api } from '@/lib/api-client';
import { useEffect, useState } from 'react';

export function LiquidityHeatmap() {
  const [view, setView] = useState<"chart" | "grid">("chart");
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ pools: any[] }>('/api/market/liquidity')
      .then(data => {
        // Transform into chart format (aggregate by chain)
        const byChain = data.pools.reduce((acc: any, p: any) => {
          if (!acc[p.chain]) acc[p.chain] = { chain: p.chain, depth: 0, volume: 0, pools: [] };
          acc[p.chain].depth += p.depth || 0;
          acc[p.chain].volume += p.volume24h || 0;
          acc[p.chain].pools.push(p);
          return acc;
        }, {});
        // ... set state
      })
      .finally(() => setLoading(false));
  }, []);
```

---

### 4.26 — UPDATE: `frontend/src/components/layout/StatusStrip.tsx`

**Delete:**
- Lines 7-14 (DEFAULT_TICKER array)
- Line 17: `const [items] = useState<TickerItem[]>(DEFAULT_TICKER);`

**Replace with:**
```typescript
import { useEffect, useState } from "react";
import { api } from '@/lib/api-client';

export function StatusStrip() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<{ items: TickerItem[] }>('/api/market/ticker');
        setItems(data.items);
      } catch { /* keep empty */ }
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);
```

---

### 4.27 — UPDATE: `frontend/src/components/watchlist/Watchlist.tsx`

**Delete:**
- Lines 8-16 (DEFAULT_WATCHLIST array)

**Replace with:**
- Fetch from coinGeckoService via backend endpoint
- `GET /api/market/prices` (new route on backend)
- Query `prisma.watchlistItem` + enrich with live prices

```typescript
export function Watchlist() {
  const { watchlist, setWatchlist, fetchWatchlist } = useWalletStore();
  
  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);
  
  const items = watchlist; // Remove the fallback to DEFAULT_WATCHLIST
```

---

### 4.28 — UPDATE: `frontend/src/hooks/useWebSocket.ts`

**Delete:**
- Lines 30-49 (entire simulation fallback block)

**Replace with:** Just the real connection logic. Remove the `if (!url)` branch entirely. Always require a URL.

```typescript
useEffect(() => {
  if (!url) return; // Don't simulate, just skip
  
  const connect = () => {
    // ... existing real WS connection code from lines 52-84
  };
  
  connect();
  
  return () => {
    clearTimeout(reconnectRef.current);
    wsRef.current?.close();
  };
}, [url, ...]);
```

---

### 4.29 — UPDATE: `frontend/src/components/layout/WalletButton.tsx` (NEW)

Create file:
```typescript
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletButton() {
  return <ConnectButton />;
}
```

---

### 4.30 — UPDATE: `frontend/src/components/layout/Header.tsx`

**Delete:**
- Lines 56-61 (hardcoded wallet button `0x1a2b...3c4d`)
- Line 3: `import { Search, Bell, Wallet, ChevronDown } from "lucide-react";` — remove `Wallet`

**Replace wallet button with:**
```typescript
import { WalletButton } from './WalletButton';
// ...
<WalletButton />
```

Remove hardcoded ETH chain selector or make it dynamic from wallet state.

---

### 4.31 — UPDATE: `frontend/src/app/layout.tsx`

**Wrap with WagmiProvider + RainbowKitProvider:**
```typescript
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config as wagmiConfig } from '@/lib/wagmi';

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

---

### 4.32 — NEW FILE: `frontend/src/lib/wagmi.ts`

```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, arbitrum, base, avalanche, bsc } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'GhostRoute Terminal',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
  chains: [mainnet, arbitrum, base, avalanche, bsc],
});
```

---

### 4.33 — UPDATE: `backend/prisma/schema.prisma` (ADD MODELS)

Add after the existing models:
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
  id          String   @id @default(uuid())
  chainId     Int
  poolAddress String
  token0      String
  token1      String
  reserve0    Float
  reserve1    Float
  timestamp   DateTime @default(now())
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
  userId     String
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

---

### 4.34 — NEW FILES: BullMQ Jobs

Create `backend/src/jobs/` with these files:

**`backend/src/jobs/index.ts`:**
```typescript
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { config } from '../config.js';

const connection = { url: config.redis.url };

export const priceQueue = new Queue('price-updates', { connection });
export const metricsQueue = new Queue('chain-metrics', { connection });
export const monitorQueue = new Queue('transaction-monitor', { connection });

// Schedulers
new QueueScheduler('price-updates', { connection });
new QueueScheduler('chain-metrics', { connection });
new QueueScheduler('transaction-monitor', { connection });
```

**`backend/src/jobs/priceUpdate.job.ts`:**
```typescript
import { Job } from 'bullmq';
import { coinGeckoService } from '../services/coinGeckoService.js';
import { prisma } from '../index.js';
import { redis } from '../index.js';

export async function priceUpdateJob(job: Job) {
  const prices = await coinGeckoService.getTokenPrices(['ETH', 'USDC', 'USDT', 'BTC', 'SOL', 'AVAX', 'BNB', 'ARB']);
  for (const [symbol, data] of Object.entries(prices)) {
    await redis.set(`price:${symbol}`, JSON.stringify(data), 'EX', 30);
    await prisma.tokenPrice.create({ data: { symbol, priceUsd: data.usd, source: 'coingecko' } });
  }
}
```

**`backend/src/jobs/chainMetrics.job.ts`:**
```typescript
import { Job } from 'bullmq';
import { defiLlamaService } from '../services/defiLlamaService.js';

export async function chainMetricsJob(job: Job) {
  const chains = await defiLlamaService.getChains();
  for (const chain of chains) {
    await redis.set(`chain:tvl:${chain.chainId}`, chain.tvl, 'EX', 60);
    await redis.set(`chain:metrics:${chain.chainId}`, JSON.stringify(chain), 'EX', 60);
  }
}
```

**`backend/src/jobs/alertGenerator.job.ts`:**
```typescript
import { Job } from 'bullmq';
import { prisma } from '../index.js';

export async function alertGeneratorJob(job: Job) {
  // 1. Check gas prices vs moving average → create gas_spike alert
  // 2. Check relayer heartbeats → create relayer_failure alert  
  // 3. Check settlement success rates → create bridge_outage alert
  // See section 2F for detailed conditions
}
```

**`backend/src/jobs/rpcHealthCheck.job.ts`:**
```typescript
import { Job } from 'bullmq';
import { rpcService } from '../services/rpcService.js';

export async function rpcHealthCheckJob(job: Job) {
  const chains = [1, 42161, 8453, 101, 43114, 56];
  for (const chainId of chains) {
    const healthy = await rpcService.checkRpcHealth(chainId);
    await redis.set(`rpc:health:${chainId}`, healthy ? '1' : '0', 'EX', 30);
  }
}
```

---

### 4.35 — UPDATE: `backend/src/websocket/handler.ts` (REWRITE)

**Delete:**
- Lines 62-69 (mock interval)
- Lines 74-125 (generateEvent function)

**Replace with Redis Pub/Sub pattern:**
```typescript
import { Redis } from 'ioredis';
import { config } from '../config.js';

const pubSub = new Redis(config.redis.url);

export function websocketHandler(socket: WebSocket, request: FastifyRequest) {
  // ... (keep client tracking, subscribe/unsubscribe, ping/pong)
  
  // Subscribe to Redis channel for events
  const subscriber = new Redis(config.redis.url);
  subscriber.subscribe('ws:events', (err) => {
    if (!err) socket.send(JSON.stringify({ type: 'connected', ... }));
  });
  
  subscriber.on('message', (channel, message) => {
    try {
      const event = JSON.parse(message);
      if (client.subscriptions.has(event.channel) || client.subscriptions.size === 0) {
        socket.send(JSON.stringify(event));
      }
    } catch { /* ignore */ }
  });
  
  socket.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
    clients.delete(clientId);
  });
}
```

---

## 5. Dependency Checklist

### 5.1 — New npm Packages

| Package | Version | Where | Purpose |
|---------|---------|-------|---------|
| `@solana/web3.js` | `^2.0.0` | Backend | Solana RPC connectivity (NOT ethers.js) |
| `axios` | `^1.7.0` | Backend | HTTP client for REST APIs (if not already) |
| `bullmq` | `^5.0.0` | Backend | Job queue for periodic data fetching |
| `wagmi` | `^2.x` | Frontend | Wallet connection hooks |
| `viem` | `^2.x` | Frontend | TypeScript Ethereum interactions |
| `@rainbow-me/rainbowkit` | `^2.x` | Frontend | Wallet UI (ConnectButton) |
| `@tanstack/react-query` | `^5.x` | Frontend | Required by wagmi/rainbowkit |

### 5.2 — New API Keys

| Service | Key Name | Required? | Cost | Usage |
|---------|----------|-----------|------|-------|
| Alchemy | `ALCHEMY_KEY` | YES (5 chains) | Free tier: 300M CU/mo | RPC endpoints for ETH, ARB, BASE, AVAX |
| CoinGecko | `COINGECKO_API_KEY` | YES | Free: 30 req/min, Pro: $49/mo | Token prices, market charts |
| 1inch | `ONEINCH_API_KEY` | YES | Free tier available | DEX swap quotes, calldata |
| Socket | `SOCKET_API_KEY` | Optional | Free tier available | Bridge/DEX route fallback |
| WalletConnect | `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | YES | Free | Wallet connection |

### 5.3 — New Environment Variables

| Variable | File | Purpose |
|----------|------|---------|
| `ETH_RPC` | backend `.env` | Ethereum RPC with real API key |
| `ARB_RPC` | backend `.env` | Arbitrum RPC with real API key |
| `BASE_RPC` | backend `.env` | Base RPC with real API key |
| `SOL_RPC` | backend `.env` | Solana RPC URL (Helius, QuickNode, etc.) |
| `AVAX_RPC` | backend `.env` | Avalanche RPC with real API key |
| `COINGECKO_API_KEY` | backend `.env` | CoinGecko Pro API key |
| `ONEINCH_API_KEY` | backend `.env` | 1inch developer API key |
| `SOCKET_API_KEY` | backend `.env` | Socket.tech API key |
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | frontend `.env.local` | `ws://localhost:3001/ws` |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | frontend `.env.local` | WalletConnect Cloud project ID |

### 5.4 — Backend Service Changes

- **Solana RPC** needs `@solana/web3.js` — ethers.js CANNOT connect to Solana (non-EVM). This is a hard blocker identified in `cto-review.md:85`.
- **Redis** is required for caching. Already configured, but verify it's running in production.
- **PostgreSQL** must have migrations run: `prisma migrate dev` after schema changes.
- **BullMQ** requires Redis. Add `bullmq` to `backend/package.json`.

---

## 6. Testing Strategy

### Step 1: Per-File Validation (Developer Does)

For each file rewritten:
1. **TypeScript compilation** — `npx tsc --noEmit` (backend) / `npm run typecheck` (frontend)
2. **Build check** — `npm run build` passes
3. **Lint** — `npm run lint` passes
4. **Manual curl test** — For backend routes:
   ```bash
   # After backend starts:
   curl http://localhost:3001/api/market/chains | jq '.chains | length'
   # Should return real chain data (>= 1 chain if RPC/DeFiLlama works)
   
   curl http://localhost:3001/api/kpi | jq '.tvl'
   # Should return > 0 if DeFiLlama responds
   
   curl http://localhost:3001/api/system/health | jq '.network'
   # Should reflect actual RPC health
   ```

### Step 2: Integration Gate (Before Moving to Next Phase)

| Phase | Gate Criteria | Test Command |
|-------|---------------|--------------|
| P0 done | Market Matrix shows real data (gas, TVL, prices) | `curl /api/market/chains` + frontend visual check |
| P1 done | Execution Blotter returns real quotes | `curl -X POST /api/execution/simulate -H 'Content-Type: application/json' -d '{...}'` |
| P2 done | Wallet connects + shows real balance | Frontend: click Connect → RainbowKit modal → signature |
| P3 done | Settlement Inspector shows real on-chain data | `curl /api/settlement/proofs` → empty (expected) or real data |
| P4 done | WebSocket emits real events | `wscat -c ws://localhost:3001/ws` → should receive events |

### Step 3: Mock API Removal Gate

**Do NOT delete frontend mock API routes until BOTH:**
1. Backend is running with real data (P0 + P1 complete)
2. Frontend API client (`api-client.ts`) successfully fetches from backend for every endpoint

**Transition approach:**
- Phase 1: Keep mock routes. Add environment variable `NEXT_PUBLIC_API_URL` defaulting to frontend's own mock routes.
- Phase 2: Switch default to `http://localhost:3001`. If backend is down, show error state — do NOT fall back to mock.
- Phase 3: Delete mock route files entirely.

### Step 4: Canary Testing

For each external API integration, run this canary before deploying:
```typescript
// test-canary.ts — Run BEFORE merging to main
async function canaryCheck() {
  const checks = {
    rpc: await checkRpcConnectivity(),
    coinGecko: await checkCoinGeckoPrice(),
    defiLlama: await checkDefiLlamaTVL(),
    oneInch: await checkOneInchQuote(),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok);
  if (failed.length > 0) {
    console.error('CANARY FAILED:', failed.map(([k]) => k).join(', '));
    process.exit(1);
  }
  console.log('All canaries passed');
}
```

---

## 7. Rollback Plan

### Per-File Rollback (Developer-Level)

Every change is isolated to a single file. Use git:
```bash
git checkout HEAD -- path/to/file.ts  # Revert single file
git diff path/to/file.ts              # Verify reversion
```

### Per-Phase Rollback

| Phase | Rollback Action | Impact |
|-------|----------------|--------|
| P0 (Services + market routes) | `git revert <commit-hash>` for service files. Reset `.env` to old RPC URLs. | Frontend unaffected (still calls mock API). Backend returns old mock data. |
| P1 (Execution + routes) | Revert route files. Comment out service calls. | Execution Blotter returns 500s. Revert to setTimeout handlers. |
| P2 (Wallet) | Revert layout.tsx, remove wagmi/rainbowkit deps. | Wallet button becomes non-functional. `useWalletStore.connect()` still works via wagmi sync code — need to re-add mock connect. |
| P3 (Settlement + DB) | Revert schema changes + migrations (`prisma migrate down`). | Settlement tables are empty. Route queries fall back to mock. |
| P4 (WebSocket + alerts) | Revert handler.ts, keep old simulateEvent. | WS emits mock events. Alerts fall back to createInitialAlerts(). |

### Emergency Switch: `USE_MOCK_DATA` Env Var

Add a global flag to the backend config:
```typescript
// backend/src/config.ts
export const config = {
  useMockData: process.env.USE_MOCK_DATA === 'true',
  // ...
};
```

Then in every route:
```typescript
if (config.useMockData) {
  return reply.send(mockChainsArray); // Keep old mock code as fallback
}
const realData = await fetchRealData();
```

**IMPORTANT:** This switch is for emergency only. It should log a WARN on every use and be removed after 2 weeks of stable production operation.

### Frontend Fallback Strategy

For each dataset, the frontend should show informative empty states:
- If API returns 5xx: Show "API temporarily unavailable" — do NOT show stale data
- If API returns 4xx: Log error and show empty state
- Never silently fall back to hardcoded data (remove CHAIN_DATA, DEFAULT_TICKER, DEFAULT_WATCHLIST, etc.)

### Monitoring Rollback Triggers

Automatically revert if these conditions are met:
- **RPC failure rate > 10%** over 5 minutes → fall back to cached data (not mock)
- **External API latency > 5s** for 3 consecutive calls → skip that source, try next
- **No external API available** → return cached data with `stale: true` flag in response
- **DO NOT return mock data** as fallback — cache staleness is acceptable, but fabricated data is dangerous

---

## Summary of All Files to Modify

| Action | Count | Phase |
|--------|-------|-------|
| **NEW** backend service files | 9 | P0-P1 |
| **REWRITE** backend route files | 5 | P0-P1 |
| **REWRITE** backend index.ts routes (kpi, health) | 2 | P0 |
| **ADD** Prisma models | 5 | P3 |
| **NEW** BullMQ job files | 5 | P3-P4 |
| **REWRITE** backend WebSocket handler | 1 | P4 |
| **NEW** frontend API client + wagmi config | 2 | P2 |
| **UPDATE** frontend stores (add async actions) | 5 | P0-P4 |
| **UPDATE** frontend components (remove hardcoded data) | 9 | P0-P4 |
| **UPDATE** frontend hooks (remove simulation) | 1 | P4 |
| **UPDATE** frontend layout (add providers) | 1 | P2 |
| **NEW** WalletButton | 1 | P2 |
| **DELETE** frontend mock API routes | 21 | P4 |
| **UPDATE** backend config + env files | 2 | P0 |
| **UPDATE** Prisma schema + seed | 2 | P3 |

**Total: 71 file operations across 4 phases.**
