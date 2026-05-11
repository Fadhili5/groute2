# End-to-End Walkthrough

This document walks through every screen and action in GhostRoute Terminal from the moment you open the app to completing a cross-chain transfer. Each step shows what you see, what happens behind the scenes, and how the data flows.

---

## Table of Contents

1. [App Load & Login](#1-app-load--login)
2. [Home Screen Overview](#2-home-screen-overview)
3. [Market Matrix — View Chain Intelligence](#3-market-matrix--view-chain-intelligence)
4. [Liquidity Heatmap — Explore Pool Depth](#4-liquidity-heatmap--explore-pool-depth)
5. [AI Solver — Get Route Recommendations](#5-ai-solver--get-route-recommendations)
6. [Route Visualizer — See the Path](#6-route-visualizer--see-the-path)
7. [Execution Blotter — Simulate, Optimize, Execute](#7-execution-blotter--simulate-optimize-execute)
8. [Command Terminal — Power User Mode](#8-command-terminal--power-user-mode)
9. [Alerts Feed — Monitor Events](#9-alerts-feed--monitor-events)
10. [Settlement Inspector — Verify On-Chain](#10-settlement-inspector--verify-on-chain)
11. [Watchlist — Track Assets](#11-watchlist--track-assets)
12. [Status Strip & Header KPI Bar](#12-status-strip--header-kpi-bar)
13. [WebSocket Live Updates](#13-websocket-live-updates)
14. [End-to-End Order Lifecycle Map](#14-end-to-end-order-lifecycle-map)

---

## 1. App Load & Login

### Step 1.1 — Open the App

Open `http://localhost:3000` in a browser.

**What renders:**
1. `layout.tsx` — Root layout with dark theme (`bg-matrix-bg`, `font-mono`)
2. `TerminalShell` — Main layout wrapper with sidebar, header, content area, status strip
3. `page.tsx` — Tab navigation + module rendering + right sidebar (AI Solver + Watchlist)

**Data flow:**
```
Browser → Next.js server → layout.tsx (HTML shell) → page.tsx (client JS)
                                                          │
                                                          ├── useWebSocket() starts
                                                          │   ├── No URL → simulation mode
                                                          │   │   └── setInterval(8s): random gas updates + alerts
                                                          │   └── URL → WS connection
                                                          │
                                                          ├── MarketMatrix mounts
                                                          │   └── fetch /api/market/chains
                                                          │
                                                          ├── Header reads wallet-store kpis
                                                          ├── Sidebar reads wallet-store systemHealth
                                                          └── StatusStrip renders ticker from wallet-store
```

### Step 1.2 — Connect Wallet (Optional in Mock Mode)

Click the wallet button in the header.

**What happens:**
1. `useWalletStore.connect()` is called
2. Sets `connected: true`, mock `address`, and `balance: 100000`
3. Header badge updates to show connected address (truncated)
4. All modules now show "wallet connected" indicators

**Files involved:**
| File | Role |
|------|------|
| `frontend/src/components/layout/Header.tsx` | Renders wallet button + connection status |
| `frontend/src/stores/wallet-store.ts` | Manages `connected`, `address`, `balance` |
| `frontend/src/app/page.tsx` | Wires up the header within TerminalShell |

---

## 2. Home Screen Overview

### What You See

```
┌─────────────────────────────────────────────────────────────────────┐
│  [GhostRoute Logo]  [TVL: $847M] [Vol: $234M] [Routes: 1847] [MEV] │  ← Header
├────┬────────────────────────────────────────────────┬───────────────┤
│    │                                                │  AI Solver    │
│ S  │  MARKET  EXECUTION  ROUTES  LIQUIDITY           │  ──────────── │
│ I  │  SETTLEMENT  TERMINAL  ALERTS  WATCHLIST       │  Recommended  │
│ D  │                                                │  Route:       │
│ E  │  ┌────────────────────────────────────────┐    │  ETH → ...    │
│ B  │  │  Market Matrix (AG Grid)               │    │               │
│ A  │  │  Chain  │ Liq  │ Spread │ Gas │ MEV    │    │  Watchlist    │
│ R  │  │  ETH    │ $842M │ 0.02%  │ 12.4 │ LOW   │    │  ──────────── │
│    │  │  ARB    │ $456M │ 0.03%  │ 0.08 │ LOW   │    │  USDC: $1.00  │
│    │  │  ...    │       │        │      │       │    │  ETH:  $2842  │
│    │  └────────────────────────────────────────┘    │               │
├────┴────────────────────────────────────────────────┴───────────────┤
│  [ETH: 12.4 gwei] [ARB: 0.08 gwei] [Route completed] [MEV alert]  │  ← StatusStrip
└─────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
TerminalShell
├── Header (useWalletStore → kpis)
│   ├── KPI bar: TVL, Volume24h, RoutesExecuted, MEVProtected
│   ├── Search input (UI only)
│   └── Wallet connect button
├── Sidebar (useWalletStore → systemHealth, useUIStore → collapsed)
│   ├── Navigation items (8 tabs)
│   └── System health indicator (green dot + relayers count)
├── Main Content (tab-switched)
│   └── Active module (starts at MarketMatrix)
├── Right Panel
│   ├── AiSolver (local state, hardcoded recommendation)
│   └── Watchlist (useWalletStore → watchlist)
└── StatusStrip (useWalletStore → ticker)
    └── Scrolling ticker items from /api/market/ticker
```

---

## 3. Market Matrix — View Chain Intelligence

### What You Do

Open app → default tab is "MARKET" → Market Matrix loads.

### What You See

An AG Grid table with 6 chains and 9 metrics:

| Chain | Liquidity | Spread | Gas | Bridge | Slip | Lat | Privacy | MEV | ETA | Status |
|-------|-----------|--------|-----|--------|------|-----|---------|-----|-----|--------|
| ETH | $842M | 0.02% | 12.4 | 0.05bp | 0.01% | 12s | 85 | LOW | 12s | ● |
| ARB | $456M | 0.03% | 0.08 | 0.03bp | 0.02% | 3s | 78 | LOW | 8s | ● |
| BASE | $234M | 0.04% | 0.06 | 0.04bp | 0.03% | 2s | 72 | LOW | 6s | ● |
| SOL | $678M | 0.01% | 0.0002 | 0.02bp | 0.01% | 1s | 45 | MED | 4s | ● |
| AVAX | $189M | 0.05% | 0.15 | 0.06bp | 0.04% | 5s | 70 | LOW | 10s | ● |
| BNB | $312M | 0.03% | 0.04 | 0.04bp | 0.02% | 4s | 55 | MED | 7s | ● |

### Behind the Scenes

```
MarketMatrix mounts
  │
  ├── useEffect fires
  │   └── fetch("/api/market/chains")
  │         │
  │         ▼
  │   frontend/src/app/api/market/chains/route.ts
  │         │
  │         └── GET() → returns hardcoded CHAINS array (6 chains)
  │               │
  │               ▼
  │         setRowData(chains) → AG Grid re-renders
  │
  ├── setInterval(30000ms): refetch /api/market/chains
  │     (simulates live data refresh)
  │
  └── WebSocket simulation (every 8s):
        useMarketStore.setState({ chains: chains.map(c => ({...c, gas: randomWalk() })) })

       Note: MarketMatrix uses local rowData state, NOT useMarketStore.chains directly.
       This means WebSocket gas updates don't visibly affect the grid in mock mode.
```

**Cell renderers used:**
| Cell | Renderer | Logic |
|------|----------|-------|
| Chain name | `ChainRenderer` | Shows colored dot + chain symbol |
| Liquidity | `LiquidityCell` | Formats as $842M, $1.2B |
| Spread | `SpreadCell` | Green ≤0.03%, Yellow ≤0.04%, Red >0.04% |
| Gas | `GasCell` | Green <$1, Yellow <$5, Red ≥$5 |
| Bridge fee | `MetricCell` | Simple number display |
| Slippage | `SlipCell` | Green ≤0.02%, Yellow ≤0.03%, Red >0.03% |
| Latency | `MetricCell` | Appends "s" suffix |
| Privacy | `PrivacyBadge` | Blue ≥80, Green ≥60, Yellow <60 |
| MEV | `MevBadge` | "LOW" ≥80, "MED" ≥60, "HIGH" <60 |
| Status | `StatusCell` | Colored dot (green/yellow/red) |
| ETA | `MetricCell` | Plain text display |

### Column Visibility Menu

Click the hamburger icon (☰) in the panel header → checklist of all columns → toggle visibility.

**Data flow:** Local `visibleColumns` state → `COL_DEFS.filter(colDef => visibleColumns.includes(colDef.field!))` → AG Grid `columnDefs` prop.

---

## 4. Liquidity Heatmap — Explore Pool Depth

### What You Do

Click the **LIQUIDITY** tab.

### What You See

```
┌─────────────────────────────────────────────────────────────┐
│  Liquidity Heatmap                    [Bar View] [Pool Grid] │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cross-Chain Liquidity Depth                          │  │
│  │  ████████████████████████████████ USDC (ETH)  320M    │  │
│  │  █████████████████████████ USDT (ETH)    280M    │  │
│  │  ██████████████████████████████████ SOL (SOL) 380M    │  │
│  │  ████████████████ USDC (ARB)  220M                    │  │
│  │  ████████████████ USDC (SOL)  410M                    │  │
│  │                                        Total: 2.5B    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Behind the Scenes

```
LiquidityHeatmap mounts
  │
  ├── fetch("/api/market/liquidity")
  │     └── Returns hardcoded pools array (8 pools across ETH/ARB/SOL)
  │
  └── Toggle between:
        ├── "bar" → Recharts BarChart with colored bars per chain
        └── "grid" → Table view with pool details (depth, APY, volume)
```

**Files:**
| File | Role |
|------|------|
| `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx` | Component + chart rendering |
| `frontend/src/app/api/market/liquidity/route.ts` | API endpoint (hardcoded) |

---

## 5. AI Solver — Get Route Recommendations

### What You Do

The AI Solver is always visible in the right sidebar. No action needed — it loads automatically.

### What You See

```
┌─────────────────────┐
│  AI Solver           │
│  ─────────────────── │
│                      │
│  Recommended Route   │
│  ┌─────────────────┐ │
│  │ ETH → LayerZero  │ │
│  │ → Arbitrum →     │ │
│  │ Uniswap V3 →     │ │
│  │ USDC             │ │
│  └─────────────────┘ │
│                      │
│  Confidence: 94%     │
│  Bridge: 99.8% uptime│
│  MEV: Low risk       │
│                      │
│  Alternatives:       │
│  • ETH → Across →   │
│    Base → USDC       │
│  • ETH → CCTP →     │
│    Avalanche → USDC  │
└─────────────────────┘
```

### Behind the Scenes

```
AiSolver mounts
  └── Renders local hardcoded recommendation data
      (no API calls, no zustand store interaction)
      - path: "ETH → LayerZero → Arbitrum → Uniswap V3 → USDC"
      - confidence: 94
      - bridgeHealth: "99.8% uptime"
      - alternatives array of 2 alternative routes
```

**Intended future flow:** `GET /api/routes/recommend` → store in `useRouteStore.aiRecommendation` → AiSolver reads from store.

---

## 6. Route Visualizer — See the Path

### What You Do

Click the **ROUTES** tab. The Route Visualizer shows the fragment pipeline for the current route.

### What You See

```
┌─────────────────────────────────────────────────────────────┐
│  Route Visualization                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │Wallet │→│Split │→│Bridge│→│ Swap │→│ Liq  │→│Settle│ │
│  │0.2s   │  │0.5s  │  │2.1s  │  │1.8s  │  │0.3s  │  │0.5s  │ │
│  │$0.00  │  │$0.01 │  │$0.05 │  │$0.03 │  │$0.02 │  │$0.01 │ │
│  │ ✓     │  │ ✓    │  │ ✓    │  │ ✓    │  │ ✓    │  │ ✓    │ │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘ │
│                                                              │
│  Total: 5.1s | $0.10 | 94% confidence                        │
└─────────────────────────────────────────────────────────────┘
```

### Behind the Scenes

```
RouteVisualizer mounts
  │
  ├── useTerminalStore → activeRoute
  │     ├── If activeRoute is set → render its fragments
  │     └── If null → use hardcoded SAMPLE_FRAGMENTS
  │
  └── Each fragment shows: type icon, label, duration, cost, status badge
      Fragment types: wallet, split, bridge, swap, liquidity, settlement
```

---

## 7. Execution Blotter — Simulate, Optimize, Execute

This is the core workflow. It has 3 sequential steps.

### What You Do

Click the **EXECUTION** tab. Fill in the form and click buttons in order:

### Step 7.1 — Simulate

Fill the form:
- Source Asset: USDC
- Dest Asset: ETH
- Source Chain: Arbitrum
- Dest Chain: Ethereum
- Amount: 50000
- Privacy: ON, Fragmentation: ON
- Slippage: 0.5%
- Bridge: LayerZero
- MEV Guard: ON

Click **Simulate**.

**What you see:** Status badge changes to `SIMULATING` → after 1.5s → `SIMULATED`.

**Behind the scenes:**
```
handleSimulate()
  └── setStatus("simulating")
        └── setTimeout(1500ms):
              └── setStatus("simulated")
              
Note: No actual API call is made. The status update is purely local state.
```

**Intended future flow:**
```
POST /api/execution/simulate
  Body: { sourceAsset, destinationAsset, sourceChain, destinationChain, amount,
          privacyMode, fragmentationMode, slippageTolerance, bridgePreference, mevGuard }
  → Zod validation
  → Redis cache result (TTL: 300s)
  → Returns: { id, gas, bridgeFee, slippage, eta, confidence, fragments, route, fee }
```

### Step 7.2 — Optimize

Click **Optimize**. Status badge changes to `OPTIMIZING` → after 2s → `OPTIMIZED`.

**Behind the scenes:** Same pattern — local `setTimeout`, no API call.

### Step 7.3 — Execute

Click **Execute** (enabled after Simulate or Optimize). Status changes to `EXECUTING` → after 3s → `COMPLETED`.

**Behind the scenes:**
```
POST /api/execution/execute
  Body: same as simulate
  → Generates mock tx hash (64 random hex chars)
  → Returns order with status "executing"
  → In backend: setTimeout(5000ms) → marks completed

Frontend: setTimeout(3000ms) → setStatus("completed")
Backend:  setTimeout(5000ms) → marks order completed in Redis
```

### Form Fields

| Field | Type | Options |
|-------|------|---------|
| Source Asset | Select | USDC, USDT, ETH, BTC, SOL, AVAX |
| Dest Asset | Select | USDC, USDT, ETH, BTC, SOL, AVAX |
| Source Chain | Select | Ethereum, Arbitrum, Base, Solana, Avalanche, BNB Chain |
| Dest Chain | Select | Ethereum, Arbitrum, Base, Solana, Avalanche, BNB Chain |
| Amount | Text input | Any number |
| Privacy Mode | Toggle | ON/OFF |
| Fragmentation | Toggle | ON/OFF |
| Slippage | Text + % | Default 0.5% |
| Bridge | Select | LayerZero, Wormhole, Across, Stargate, Hop, CCTP |
| MEV Guard | Toggle | ON/OFF |

**Files:**
| File | Role |
|------|------|
| `frontend/src/components/execution-blotter/ExecutionBlotter.tsx` | Form UI + 3 handlers |
| `frontend/src/app/api/execution/execute/route.ts` | Execute endpoint |
| `frontend/src/app/api/execution/simulate/route.ts` | Simulate endpoint |
| `frontend/src/app/api/execution/optimize/route.ts` | Optimize endpoint |
| `frontend/src/app/api/execution/orders/route.ts` | Orders list endpoint |

---

## 8. Command Terminal — Power User Mode

### What You Do

Click the **TERMINAL** tab. Type commands in the xterm.js-style terminal.

### Available Commands

| Command | Example | What It Does |
|---------|---------|-------------|
| `route` | `route 50000 usdc arb eth private` | Simulates a route order |
| `simulate` | `simulate 100000 usdt base sol` | Simulates a transfer |
| `inspect` | `inspect 0x7f3c...8a` | Inspects a settlement |
| `watch` | `watch mev` | Adds a watchlist entry |
| `compare` | `compare usdc eth arb` | Compares two chains |
| `status` | `status` | Shows system status |
| `help` | `help` | Lists all commands |
| `clear` | `clear` | Clears terminal |

### Behind the Scenes

```
User types "route 50000 usdc arb eth private" + Enter
  │
  ├── CommandTerminal.executeCommand()
  │     ├── Parses command + args (split by space)
  │     ├── Switch on command type:
  │     │     ├── "route" → generates mock route response
  │     │     ├── "simulate" → generates mock simulation response
  │     │     ├── "inspect" → generates mock settlement data
  │     │     ├── "watch" → adds to watchlist
  │     │     ├── "compare" → generates comparison table
  │     │     ├── "status" → reads system health from store
  │     │     ├── "help" → lists commands
  │     │     └── "clear" → clears output buffer
  │     │
  │     └── useSolverStore.addTerminalOutput(formattedLine)
  │           └── Prepends $ {cmd} response\n to output array (capped 500)
  │
  └── Renders with ANSI color parsing:
        $ route 50000 usdc arb eth private
        ════════════════════════════════════
        Route Simulation Complete
        • Path: Arbitrum → Ethereum
        • Amount: 50000 USDC
        • Gas: 0.0042 ETH
        • ETA: 8.4s
        • Confidence: 94.2%
```

**Keyboard shortcuts:**
- **Arrow Up/Down** — Command history navigation
- **Enter** — Execute command
- Tab completes are not implemented

---

## 9. Alerts Feed — Monitor Events

### What You Do

Click the **ALERTS** tab. The feed auto-populates with alerts.

### What You See

```
┌─────────────────────────────────────────────────────────────┐
│  Alerts Feed                             [Filter: All ▼]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [●] 12:34:56  Route 0x7f3c: 50000 USDC ARB → ETH (12.4s)   │  ← route_success
│  [●] 12:34:48  Gas price spike detected on Base              │  ← gas_spike (warning)
│  [●] 12:34:40  MEV activity detected on Ethereum mempool     │  ← mev_event (warning)
│  [●] 12:34:32  Route 0x9a1b: 25000 USDC ETH → BASE (8.2s)   │  ← route_success
│  [●] 12:34:24  Bridge latency spike: LayerZero +340ms        │  ← bridge_outage (warning)
│  [●] 12:34:16  Route 0x3c4d: 100000 ETH SOL completed        │  ← route_success
│  [●] 12:34:08  Relayer 0x8f3c... heartbeat timeout           │  ← relayer_failure (critical)
│                                                              │
│  Alerts are generated every 8 seconds...                     │
└─────────────────────────────────────────────────────────────┘
```

### Behind the Scenes

```
AlertsFeed mounts
  │
  ├── useAlertStore.alerts.length === 0?
  │     ├── Yes → setAlerts(createInitialAlerts())
  │     │          (7 pre-generated alerts: mix of types & severities)
  │     └── No → render existing alerts
  │
  ├── setInterval(8000ms): auto-generate new alert
  │     ├── Random type: route_success | mev_event | gas_spike
  │     ├── Random severity: info | warning
  │     ├── Random message from template
  │     └── addAlert(newAlert) → prepend to store array (capped at 100)
  │
  ├── Filter dropdown: All | route_success | mev_event | bridge_outage | gas_spike | relayer_failure
  │
  └── Click alert → markAlertRead(id) → opacity reduced
```

**Alert types and severity:**
| Type | Severity | Description |
|------|----------|-------------|
| `route_success` | info | Route completed successfully |
| `mev_event` | warning | MEV activity detected |
| `bridge_outage` | warning/critical | Bridge latency spike or outage |
| `gas_spike` | warning | Gas price fluctuation |
| `liquidity_spike` | warning | Sudden liquidity change |
| `relayer_failure` | critical | Relayer heartbeat timeout |

---

## 10. Settlement Inspector — Verify On-Chain

### What You Do

Click the **SETTLEMENT** tab. Enter a transaction hash or route ID to inspect.

### What You See

```
┌─────────────────────────────────────────────────────────────┐
│  Settlement Inspector                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Transaction Hash: [0x7f3c8a2b...___________________]        │
│  Route ID:        [_____________________________]            │
│                                                              │
│  [Inspect]  [Verify On-Chain]                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Settlement Details                                   │   │
│  │                                                      │   │
│  │  Transaction: 0x7f3c8a2b1d4e...f8a                   │   │
│  │  Route ID:    0x9a1b2c3d4e...f8a                     │   │
│  │  Proof Hash:  0x3c4d5e6f7a...1c2d                    │   │
│  │  State:       ✅ Confirmed (32 confirmations)        │   │
│  │  Fees:        $12.45                                 │   │
│  │  Relayer:     0x8f3c7a2b...e7f8                      │   │
│  │  Timestamp:   1712345648901                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Behind the Scenes

```
User enters tx hash "0x7f3c8a2b..."
  │
  ├── Click "Inspect"
  │     └── POST /api/settlement/inspect { txHash }
  │           │
  │           └── Returns settlement details
  │                 { txHash, routeId, proofHash, state: "confirmed",
  │                   fees: 12.45, relayer, confirmations: 32, timestamp }
  │
  └── Click "Verify On-Chain"
        └── GET /api/settlement/verify/0x7f3c8a2b...
              │
              └── Returns verification data
                    { verified: true, block: 19876543,
                      confirmations: 32, state: "confirmed", chainId: 1 }
```

---

## 11. Watchlist — Track Assets

### What You Do

The Watchlist is always visible in the right sidebar below the AI Solver.

### What You See

```
┌─────────────────────┐
│  Watchlist           │
│  ─────────────────── │
│  USDC    $1.00  +0.1│  ← green (positive)
│  ETH   $2,842  +2.4 │  ← green
│  BTC  $67,890  -1.2 │  ← red (negative)
│  SOL    $143    +5.7 │
│  AVAX    $38    -0.8 │
│  ARB     $1.12  +3.2 │
│  BNB    $578    +1.1 │
│                      │
│  [Manage watchlist]  │
└─────────────────────┘
```

### Behind the Scenes

```
Watchlist mounts
  │
  ├── useWalletStore → watchlist
  │     ├── if length > 0 → render store data
  │     └── if length === 0 → render DEFAULT_WATCHLIST
  │           (7 assets: USDC, ETH, BTC, SOL, AVAX, ARB, BNB)
  │
  └── Each item shows: symbol, price (formatted), 24h change %
      Color: green for positive change, red for negative
```

**Note:** The zustand `watchlist` is always empty because nothing ever calls `setWatchlist`. So the default hardcoded list is always used.

---

## 12. Status Strip & Header KPI Bar

### Status Strip (Bottom Bar)

Always visible at the bottom of the screen. Scrolling ticker of live events.

```
[ETH: block 19876543 | gas 12.4 gwei]  [MEV protection engaged]  [LayerZero: 3 active relays]  [Base gas spike: 3.2 gwei (+240%)]  ...
```

**Data source:** `GET /api/market/ticker` → `useWalletStore.ticker` → StatusStrip renders as scrolling marquee.

### Header KPI Bar (Top Bar)

Always visible at the top. 4 key metrics.

```
[TVL: $847M]  [24h Volume: $234M]  [Routes: 1,847]  [MEV Protected: 98.5%]
```

**Data source:** `GET /api/kpi` → `useWalletStore.kpis` → Header renders.

---

## 13. WebSocket Live Updates

### Connection

The app optionally connects to a WebSocket server for real-time data.

**URL:** `ws://localhost:3001/ws` (configured via `NEXT_PUBLIC_WS_URL`)

### Event Flow

```
Client connects → Server sends "connected" with clientId + available channels
Client subscribes → { type: "subscribe", channel: "market" }
Server confirms → { type: "subscribed", channel: "market" }

┌─────────────────────────────────────────────────────────────┐
│  Server sends events every 3 seconds                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  market_update → useMarketStore.setChains()                  │
│  { type: "market_update", channel: "market",                │
│    data: { chain: "Ethereum", gas: "12.40",                 │
│            liquidity: 842000, spread: "0.020" } }            │
│                                                              │
│  alert → useAlertStore.addAlert()                            │
│  { type: "alert", channel: "alerts",                        │
│    data: { severity: "warning", message: "Gas spike",       │
│            timestamp: 1712345678901 } }                      │
│                                                              │
│  kpi_update → useWalletStore.setKpis()                       │
│  execution_update → (future: useSolverStore.addOrder())      │
│  settlement_update → (future: useSolverStore.addSettlement())│
└─────────────────────────────────────────────────────────────┘
```

### Simulation Mode (No WS URL)

If `NEXT_PUBLIC_WS_URL` is not set, the `useWebSocket` hook runs a client-side simulation:

```typescript
setInterval(8000ms):
  1. Update chain gas prices in useMarketStore (random walk ±2%)
  2. 30% chance: generate random alert and add to useAlertStore
```

---

## 14. End-to-End Order Lifecycle Map

This connects all the steps into one complete flow:

```
┌─────────────────────────────────────────────────────────────────────┐
│                 COMPLETE ORDER LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PHASE 1: DISCOVERY                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  1. Market Matrix loads chain data (GET /api/market/chains)     │ │
│  │  2. Liquidity Heatmap loads pool depth (GET /api/market/liquidity)│ │
│  │  3. AI Solver recommends route (hardcoded recommendation)       │ │
│  │  4. Route Visualizer shows fragment path (SAMPLE_FRAGMENTS)     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                         │
│                              ▼                                         │
│  PHASE 2: EXECUTION                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  5. Execution Blotter: Fill form (USDC ARB → ETH, 50000)       │ │
│  │  6. Click Simulate → status "simulating" → "simulated" (1.5s)  │ │
│  │  7. Click Optimize → status "optimizing" → "optimized" (2s)    │ │
│  │  8. Click Execute → status "executing" → "completed" (3s)      │ │
│  │     POST /api/execution/execute creates mock tx hash           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                         │
│                              ▼                                         │
│  PHASE 3: MONITORING                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  9. Alerts Feed generates route_success alert (every 8s)       │ │
│  │ 10. Status Strip shows ticker updates (chain, gas, routes)     │ │
│  │ 11. WebSocket updates gas prices (useMarketStore)              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                         │
│                              ▼                                         │
│  PHASE 4: SETTLEMENT                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 12. Settlement Inspector: Paste tx hash → Inspect               │ │
│  │     POST /api/settlement/inspect returns settlement data        │ │
│  │ 13. Click "Verify On-Chain"                                     │ │
│  │     GET /api/settlement/verify/:txHash returns confirmation     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                         │
│                              ▼                                         │
│  PHASE 5: COMMAND TERMINAL (Alternative Power-User Path)              │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 14. Type: route 50000 usdc arb eth private                     │ │
│  │ 15. Type: simulate 100000 usdt base sol                        │ │
│  │ 16. Type: inspect 0x7f3c...8a                                  │ │
│  │ 17. Type: watch mev                                            │ │
│  │ 18. Type: status → shows system health                         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Flow Summary

Every user action maps to a technical pipeline:

| User Action | Component | API Call | Store Update | UI Effect |
|------------|-----------|----------|-------------|-----------|
| Open app | page.tsx | GET /api/market/chains | wallet-store: kpis | Renders grid |
| View chains | MarketMatrix | GET /api/market/chains | local rowData state | AG Grid table |
| Click LIQUIDITY tab | LiquidityHeatmap | GET /api/market/liquidity | local pools state | Charts/tables |
| Click EXECUTION tab | ExecutionBlotter | — (no on-mount fetch) | local form state | Form fields |
| Click Simulate | ExecutionBlotter | POST /api/execution/simulate | local status state | Status badge |
| Click Execute | ExecutionBlotter | POST /api/execution/execute | local status state | "completed" badge |
| Click TERMINAL tab | CommandTerminal | — (client-side commands) | solver-store terminalOutput | ANSI-colored output |
| View alerts | AlertsFeed | GET /api/alerts | alert-store alerts | Filtered list |
| Inspect settlement | SettlementInspector | POST /api/settlement/inspect | local result state | Detail panel |
| Verify settlement | SettlementInspector | GET /api/settlement/verify/:txHash | local verified state | Verification result |
| Auto-refresh (30s) | MarketMatrix | GET /api/market/chains | local rowData state | Grid update |
| WS simulation (8s) | useWebSocket | — | market-store chains | Gas price update |
| WS simulation (8s) | useWebSocket | — | alert-store alerts | New alert appears |

---

## All Files Involved in the User Journey

### Layout Layer
| File | Purpose |
|------|---------|
| `frontend/src/app/layout.tsx` | Root HTML, dark theme class |
| `frontend/src/app/globals.css` | All CSS: Tailwind + AG Grid + Recharts + xterm |
| `frontend/src/app/page.tsx` | Tab system, module rendering, sidebar |
| `frontend/src/components/layout/TerminalShell.tsx` | Shell layout (sidebar + header + content + status) |
| `frontend/src/components/layout/Sidebar.tsx` | Navigation + system health |
| `frontend/src/components/layout/Header.tsx` | KPI bar + wallet button |
| `frontend/src/components/layout/StatusStrip.tsx` | Scrolling ticker |
| `frontend/src/components/layout/LayoutContext.tsx` | Sidebar collapse state context |
| `frontend/src/components/common/ErrorBoundary.tsx` | Error boundary wrapper |

### Module Layer
| File | Purpose |
|------|---------|
| `frontend/src/components/market-matrix/MarketMatrix.tsx` | Chain intelligence grid |
| `frontend/src/components/execution-blotter/ExecutionBlotter.tsx` | Order entry form |
| `frontend/src/components/route-visualizer/RouteVisualizer.tsx` | Fragment flow visualization |
| `frontend/src/components/liquidity-heatmap/LiquidityHeatmap.tsx` | Pool depth charts |
| `frontend/src/components/settlement-inspector/SettlementInspector.tsx` | Proof verification |
| `frontend/src/components/command-terminal/CommandTerminal.tsx` | Terminal emulator |
| `frontend/src/components/alerts-feed/AlertsFeed.tsx` | Alert stream |
| `frontend/src/components/watchlist/Watchlist.tsx` | Asset tracker |
| `frontend/src/components/ai-solver/AiSolver.tsx` | Route recommendations |

### API Layer (Frontend)
| File | Endpoint |
|------|----------|
| `frontend/src/app/api/market/chains/route.ts` | GET /api/market/chains |
| `frontend/src/app/api/market/liquidity/route.ts` | GET /api/market/liquidity |
| `frontend/src/app/api/market/ticker/route.ts` | GET /api/market/ticker |
| `frontend/src/app/api/execution/simulate/route.ts` | POST /api/execution/simulate |
| `frontend/src/app/api/execution/optimize/route.ts` | POST /api/execution/optimize |
| `frontend/src/app/api/execution/execute/route.ts` | POST /api/execution/execute |
| `frontend/src/app/api/execution/orders/route.ts` | GET /api/execution/orders |
| `frontend/src/app/api/execution/orders/[id]/route.ts` | GET /api/execution/orders/:id |
| `frontend/src/app/api/settlement/proofs/route.ts` | GET /api/settlement/proofs |
| `frontend/src/app/api/settlement/verify/[txHash]/route.ts` | GET /api/settlement/verify/:txHash |
| `frontend/src/app/api/settlement/inspect/route.ts` | POST /api/settlement/inspect |
| `frontend/src/app/api/routes/route.ts` | GET /api/routes |
| `frontend/src/app/api/routes/recommend/route.ts` | GET /api/routes/recommend |
| `frontend/src/app/api/routes/simulate/route.ts` | GET /api/routes/simulate |
| `frontend/src/app/api/routes/compare/route.ts` | POST /api/routes/compare |
| `frontend/src/app/api/alerts/route.ts` | GET /api/alerts |
| `frontend/src/app/api/alerts/unread/route.ts` | GET /api/alerts/unread |
| `frontend/src/app/api/alerts/[id]/read/route.ts` | PUT /api/alerts/:id/read |
| `frontend/src/app/api/health/route.ts` | GET /api/health |
| `frontend/src/app/api/kpi/route.ts` | GET /api/kpi |
| `frontend/src/app/api/system/health/route.ts` | GET /api/system/health |

### State Layer
| File | Purpose |
|------|---------|
| `frontend/src/stores/market-store.ts` | Chain market data |
| `frontend/src/stores/route-store.ts` | Route visualization |
| `frontend/src/stores/alert-store.ts` | Alert feed |
| `frontend/src/stores/solver-store.ts` | Orders, settlements, terminal |
| `frontend/src/stores/wallet-store.ts` | Wallet, watchlist, KPI, health |
| `frontend/src/stores/ui-store.ts` | Sidebar collapse |
| `frontend/src/stores/terminal-store.ts` | Mega-store (legacy) |

### Hook Layer
| File | Purpose |
|------|---------|
| `frontend/src/hooks/useWebSocket.ts` | WS connection + simulation |

### Backend Layer
| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Fastify server entry |
| `backend/src/routes/market.ts` | /api/market/* backend routes |
| `backend/src/routes/execution.ts` | /api/execution/* backend routes |
| `backend/src/routes/settlement.ts` | /api/settlement/* backend routes |
| `backend/src/routes/routes.ts` | /api/routes/* backend routes |
| `backend/src/routes/alerts.ts` | /api/alerts/* backend routes |
| `backend/src/websocket/handler.ts` | WS handler (simulated events) |
| `backend/src/middleware/error.ts` | Error handling |
| `backend/src/config.ts` | Environment config |
| `backend/prisma/schema.prisma` | Database schema |
| `backend/prisma/seed.ts` | Database seed |
