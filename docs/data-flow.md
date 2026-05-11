# Data Flow

This document describes how data moves through the GhostRoute Terminal system — from user interaction to API calls to WebSocket events to state management.

---

## 1. Page Load Flow

```
Browser requests http://localhost:3000
        │
        ▼
Next.js server renders layout.tsx (RootLayout)
        │
        ├──► HTML: <html class="dark"> + <body class="bg-matrix-bg ...">
        │
        └──► Client-side JS loads page.tsx
                │
                ├──► TerminalShell mounts
                │   ├── Sidebar (reads useUIStore → sidebarCollapsed)
                │   ├── Header (reads useWalletStore → kpis)
                │   ├── StatusStrip (local state ticker items)
                │   └── Main content area
                │
                ├──► Default activeTab = "market"
                │   └── MarketMatrix mounts
                │       ├── State: loading = true
                │       ├── FETCH GET /api/market/chains
                │       ├── On success: setRowData(chains)
                │       └── Start 30s polling interval
                │
                ├──► AiSolver mounts (right sidebar)
                │   └── Local state recommendation (hardcoded)
                │
                ├──► Watchlist mounts (right sidebar)
                │   └── Reads useWalletStore → watchlist || defaults
                │
                └──► useWebSocket() hook fires
                    ├── If no WS_URL → simulation mode
                    │   └── setInterval(8000ms):
                    │       1. Update chain gas prices (random walk)
                    │       2. Generate random alerts
                    └── If WS_URL → WebSocket connection
                        ├── ws://host:3001/ws
                        ├── Server sends { type: "connected" }
                        ├── onmessage handler:
                        │   ├── chain_update → useMarketStore.setChains()
                        │   ├── alert → useAlertStore.addAlert()
                        │   ├── kpi_update → useWalletStore.setKpis()
                        │   └── block_update → useWalletStore.setSystemHealth()
                        └── onclose → reconnect after 5s
```

---

## 2. Execution Flow (Order Lifecycle)

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION BLOTTER (Component)                 │
│                                                                  │
│  User fills form:                                                │
│   - Source: USDC (Arbitrum)                                      │
│   - Destination: ETH (Ethereum)                                  │
│   - Amount: 50000                                                │
│   - Privacy: ON, Fragmentation: ON, MEV: ON                      │
│   - Slippage: 0.5%, Bridge: LayerZero                            │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    Simulate      │  │    Optimize      │  │    Execute      │  │
│  │  (setTimeout     │  │  (setTimeout     │  │  (setTimeout    │  │
│  │   1500ms)        │  │   2000ms)        │  │   3000ms)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
        │                        │                       │
        ▼                        ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│POST /api/execution│  │POST /api/execution│  │POST /api/execution   │
│/simulate          │  │/optimize          │  │/execute              │
├──────────────────┤  ├──────────────────┤  ├──────────────────────┤
│Request Body:      │  │Request Body:      │  │Request Body:          │
│Zod-validated      │  │Zod-validated      │  │Zod-validated          │
│                   │  │                   │  │                      │
│Response:          │  │Response:          │  │Response:              │
│{                  │  │{                  │  │{                     │
│  id: "sim-...",   │  │  id: "opt-...",  │  │  id: "exec-...",    │
│  gas: 0.0042,     │  │  route: "...",   │  │  status: "executing",│
│  bridgeFee: 25,   │  │  savings: "12%", │  │  txHash: "0x...",   │
│  slippage: 0.0005,│  │  confidence: 94, │  │  timestamp: ...     │
│  eta: "8.4s",     │  │  privacy: 85,    │  │} ← Redis cache      │
│  confidence: 94   │  │} ← Redis cache   │  │  TTL: 3600s         │
│} ← Redis cache    │  │  TTL: 300s       │  └──────────────────────┘
│  TTL: 300s        │  └──────────────────┘           │
└──────────────────┘                                  │
                                                      │
                                               setTimeout 5000ms
                                                      │
                                                      ▼
                                            ┌──────────────────────┐
                                            │order.status =         │
                                            │"completed"           │
                                            │Redis TTL: 3600s      │
                                            └──────────────────────┘
```

---

## 3. WebSocket Event Flow

```
Frontend (Browser)                     Backend (Fastify)
        │                                    │
        │  ws://host:3001/ws                  │
        │──────────────────────────────────>  │
        │                                    │  const clientId = generateId()
        │                                    │  clients.set(clientId, client)
        │  { type: "connected",              │
        │    clientId: "c_...",              │
        │    channels: [...] }               │
        │<──────────────────────────────────  │
        │                                    │
        │  { type: "subscribe",              │
        │    channel: "market" }             │
        │──────────────────────────────────>  │  client.subscriptions.add("market")
        │  { type: "subscribed",             │
        │    channel: "market" }             │
        │<──────────────────────────────────  │
        │                                    │
        │  ┌──────────────────────────────┐  │
        │  │ setInterval(3000ms):         │  │
        │  │   channel = random pick      │  │
        │  │   if subscriptions.has() or  │  │
        │  │      no subscriptions:       │  │
        │  │     sendEvent()              │  │
        │  └──────────────────────────────┘  │
        │                                    │
        │  { type: "market_update",          │
        │    channel: "market",              │
        │    data: { chain: "ETH",           │
        │            gas: "12.40",           │
        │            liquidity: 842000 } }   │
        │<──────────────────────────────────  │
        │                                    │
        │  → useMarketStore.setChains()      │
        │    (merges gas data into state)    │
        │                                    │
        │  { type: "alert",                  │
        │    channel: "alerts",              │
        │    data: { severity: "warning",    │
        │            message: "Gas spike"} } │
        │<──────────────────────────────────  │
        │                                    │
        │  → useAlertStore.addAlert()        │
        │                                    │
        │  { type: "ping" }                  │
        │──────────────────────────────────>  │
        │  { type: "pong",                   │
        │    timestamp: ... }                │
        │<──────────────────────────────────  │
```

---

## 4. Settlement Inspection Flow

```
User enters tx hash: "0x7f3c8a2b..."
        │
        ▼
SettlementInspector component
        │
        ├──► Click "Inspect" button
        │       │
        │       ▼
        │   POST /api/settlement/inspect
        │   { txHash: "0x7f3c8a2b..." }
        │       │
        │       ▼
        │   Response:
        │   { txHash, routeId, proofHash,
        │     state: "confirmed", fees, 
        │     relayer, confirmations, timestamp }
        │       │
        │       ▼
        │   Renders detail panel with state icon
        │   (green checkmark for confirmed)
        │
        └──► Click "Verify On-Chain"
                │
                ▼
            GET /api/settlement/verify/0x7f3c8a2b...
                │
                ▼
            Response:
            { verified: true, block: 19876543,
              confirmations: 32, state: "confirmed" }
```

---

## 5. Route Visualization Flow

```
RouteVisualizer component mounts
        │
        ├──► Reads useTerminalStore → activeRoute
        │       │
        │       ├── If null → uses SAMPLE_FRAGMENTS
        │       │   (hardcoded demo data)
        │       │
        │       └── If set → renders fragments
        │
        └──► GET /api/routes/simulate (via other modules)
                │
                ▼
            Response:
            { id, status, fragments: [
                { type: "wallet", label, duration, cost },
                { type: "split", label, duration, cost },
                { type: "bridge", label, duration, cost },
                { type: "swap", label, duration, cost },
                { type: "settle", label, duration, cost }
              ],
              totalDuration, totalCost, confidence }
                │
                ▼
            useRouteStore.setActiveRoute(visualization)
                │
                ▼
            RouteVisualizer re-renders with live data
```

---

## 6. Alert Feed Flow

```
AlertsFeed component mounts
        │
        ├──► useAlertStore.alerts.length === 0?
        │       │
        │       ├── Yes → setAlerts(createInitialAlerts())
        │       │   (7 pre-generated alerts)
        │       │
        │       └── No → render existing alerts
        │
        ├──► setInterval(8000ms):
        │       │
        │       ├── Random type: route_success | mev_event | gas_spike
        │       ├── Random severity: info | warning
        │       ├── Random message from template
        │       └── addAlert(newAlert)
        │               │
        │               ▼
        │           useAlertStore → alerts array (capped at 100)
        │
        ├──► WebSocket alerts (if connected)
        │       │
        │       └── onmessage(type="alert"):
        │               addAlert(msg.data)
        │
        └──► User clicks alert → markAlertRead(id)
                │
                ▼
            PUT /api/alerts/:id/read (optimistic)
                │
                ▼
            useAlertStore → marks alert.read = true
            → opacity reduced in UI
```

---

## 7. Chain Data Refresh Cycle

```
MarketMatrix mounts
        │
        ├──► FETCH GET /api/market/chains
        │       │
        │       ▼
        │   Response: { chains: [...] }
        │       │
        │       ▼
        │   setRowData(chains) → AG Grid re-renders
        │
        ├──► setInterval(30000ms): REFETCH /api/market/chains
        │       │
        │       └── Updates rowData if changed
        │
        └──► WebSocket chain_update (every 3s if subscribed)
                │
                ▼
            useMarketStore.setChains(data)
                │
                ▼
            MarketMatrix reads useMarketStore.chains
            → updates gas/liquidity values live
```

---

## 8. Key-Value Store (Redis) Usage

```
                            REDIS
                            │
  ┌─────────────────────────┼─────────────────────────┐
  │                         │                         │
  ▼                         ▼                         ▼
┌───────────┐     ┌───────────────┐     ┌──────────────────┐
│ simulate:*│     │  optimize:*   │     │  execution:*      │
│ TTL: 300s │     │  TTL: 300s    │     │  TTL: 3600s      │
│           │     │               │     │                  │
│ Key:      │     │ Key:          │     │ Key:             │
│ simulate: │     │ optimize:     │     │ execution:       │
│ {uuid}    │     │ {uuid}        │     │ {orderId}        │
│           │     │               │     │                  │
│ Value:    │     │ Value:        │     │ Value:           │
│ JSON      │     │ JSON          │     │ JSON order       │
└───────────┘     └───────────────┘     └──────────────────┘
```

---

## 9. PostgreSQL Entity Relationships

```
Chain ──────┬── Route (sourceChain)
            ├── Route (destChain)
            ├── Settlement (sourceChain)
            ├── Settlement (destChain)
            └── LiquidityPool

Intent ──────┬── IntentFragment

Settlement ──┬── Chain (source)
             └── Chain (dest)
```

See [docs/database.md](docs/database.md) for full schema.
