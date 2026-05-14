# State Management

GhostRoute Terminal uses **Zustand** for client-side state management with 6 stores. The stores are organized by domain with specific responsibilities.

---

## Store Overview

| Store | File | Purpose | Used By |
|-------|------|---------|---------|
| `useMarketStore` | `stores/market-store.ts` | Chain market data | MarketMatrix, WS handler |
| `useRouteStore` | `stores/route-store.ts` | Route visualization + AI recommendations | RouteVisualizer |
| `useAlertStore` | `stores/alert-store.ts` | Alert feed (100 max) | AlertsFeed, WS handler |
| `useSolverStore` | `stores/solver-store.ts` | Orders, settlements, liquidity, terminal | CommandTerminal |
| `useWalletStore` | `stores/wallet-store.ts` | Wallet + watchlist + KPI + health | Sidebar, Header, Watchlist, WS handler |
| `useUIStore` | `stores/ui-store.ts` | UI state (sidebar, preferences) | Sidebar |
| ~~`useTerminalStore`~~ | ~~`stores/terminal-store.ts`~~ | ~~REMOVED — redundant, duplicated all other stores~~ | ~~RouteVisualizer (now uses useRouteStore)~~ |

---

## 1. useMarketStore

**File:** `frontend/src/stores/market-store.ts`

```typescript
interface MarketState {
  chains: Chain[];           // Array of 6 chain objects with live metrics
  loading: boolean;          // Loading indicator for initial fetch
  error: string | null;      // Error state

  setChains: (chains: Chain[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

**Data Flow:**
- Initialized empty on app mount
- Populated via WebSocket `chain_update` events
- Read by `MarketMatrix` component for AG Grid rendering
- No persistence, no side effects

**Consumer Components:**
- `MarketMatrix` — reads `chains` for row data
- `useWebSocket` hook — writes via `setChains()`

---

## 2. useRouteStore

**File:** `frontend/src/stores/route-store.ts`

```typescript
interface RouteState {
  activeRoute: RouteVisualization | null;    // Current route with fragments
  aiRecommendation: AIRecommendation | null; // AI-suggested route
  loading: boolean;
  error: string | null;

  setActiveRoute: (route: RouteVisualization | null) => void;
  setAiRecommendation: (rec: AIRecommendation | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

**Data Flow:**
- `activeRoute` is set when user executes a simulation or selects a route
- `aiRecommendation` is set from GET /api/routes/recommend
- Read by `RouteVisualizer` for fragment flow display

---

## 3. useAlertStore

**File:** `frontend/src/stores/alert-store.ts`

```typescript
interface AlertState {
  alerts: Alert[];  // Capped at 100 entries (most recent first)

  addAlert: (alert: Alert) => void;     // Prepend, slice to 100
  markAlertRead: (id: string) => void;   // Optimistic local update
  setAlerts: (alerts: Alert[]) => void;  // Bulk replace
}
```

**Data Flow:**
- Initialized with 7 pre-generated alerts from `createInitialAlerts()`
- New alerts added via:
  - WebSocket `alert` events (from backend)
  - Client-side simulation interval (every 8s)
  - `addAlert()` prepends to array, slices to 100 max
- `markAlertRead()` does optimistic local update (no API call needed in demo)

---

## 4. useSolverStore

**File:** `frontend/src/stores/solver-store.ts`

```typescript
interface SolverState {
  orders: ExecutionOrder[];         // Route execution orders
  settlements: SettlementData[];    // Settlement proofs (capped at 50)
  liquidityPools: LiquidityPool[];  // Pool data
  terminalOutput: string[];         // Terminal history (capped at 500)

  addOrder: (order: ExecutionOrder) => void;
  updateOrder: (id: string, updates: Partial<ExecutionOrder>) => void;
  setOrders: (orders: ExecutionOrder[]) => void;
  addSettlement: (settlement: SettlementData) => void;
  setLiquidityPools: (pools: LiquidityPool[]) => void;
  addTerminalOutput: (line: string) => void;
  clearTerminal: () => void;
}
```

**Data Flow:**
- `terminalOutput` is written by `CommandTerminal.executeCommand()`
- Each command appends `$ {cmd}` + response + ANSI color codes
- Maintains 500-line scrollback buffer
- `setOrders` can be populated via `/api/execution/orders`

---

## 5. useWalletStore

**File:** `frontend/src/stores/wallet-store.ts`

```typescript
interface WalletState {
  connected: boolean;                    // Wallet connection status
  address: string | null;                // Connected wallet address
  balance: number;                       // Wallet balance (mock: 100000)
  watchlist: WatchlistItem[];            // Portfolio items
  systemHealth: SystemHealth;            // Network/relayer/block/API status
  kpis: KPI;                             // TVL, volume, routes, MEV protected
  ticker: TickerItem[];                  // Status strip ticker items

  connect: () => void;                   // Sets mock address + balance
  disconnect: () => void;                // Clears connection state
  setWatchlist: (items: WatchlistItem[]) => void;
  setSystemHealth: (health: SystemHealth) => void;
  setKpis: (kpis: KPI) => void;
  setTicker: (ticker: TickerItem[]) => void;
}
```

**Initial State:**
- `connected: false`, `address: null`, `balance: 0`
- `systemHealth` defaults: network "connected", 12 relayers, block 19876543, API "healthy"
- `kpis` defaults: TVL $847M, 24h vol $234M, 1847 routes, 98.5% MEV protected

**Data Flow:**
- `kpis` updated via WebSocket `kpi_update` events
- `systemHealth` updated via WebSocket `block_update` events
- `watchlist` populated from local state; "Manage watchlist" button in UI

---

## 6. useUIStore

**File:** `frontend/src/stores/ui-store.ts`

```typescript
interface UIState {
  sidebarCollapsed: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}
```

**Data Flow:**
- `sidebarCollapsed` is persisted to `localStorage` key `sidebar-collapsed`
- Loaded on mount via `useEffect` → `localStorage.getItem()`
- Toggle via sidebar collapse button
- Controls Sidebar width: `w-sidebar` (expanded) vs `w-sidebar-collapsed`

---

## 7. useTerminalStore

**File:** `frontend/src/stores/terminal-store.ts`

```typescript
interface TerminalStore {
  chains: Chain[];
  orders: ExecutionOrder[];
  alerts: Alert[];
  watchlist: WatchlistItem[];
  systemHealth: SystemHealth;
  kpis: KPI;
  ticker: TickerItem[];
  activeRoute: RouteVisualization | null;
  aiRecommendation: AIRecommendation | null;
  settlements: SettlementData[];
  liquidityPools: LiquidityPool[];
  terminalOutput: string[];

  // All setter methods for each field
  setChains, setOrders, addOrder, updateOrder,
  addAlert, markAlertRead, setWatchlist,
  setSystemHealth, setKpis, setTicker,
  setActiveRoute, setAiRecommendation,
  addSettlement, setLiquidityPools,
  addTerminalOutput, clearTerminal
}
```

**Note:** This store duplicates functionality from other stores. It serves as a combined store for modules that need multiple data domains (e.g., RouteVisualizer reads `activeRoute`). In practice:
- `useTerminalStore.activeRoute` is read by `RouteVisualizer`
- Other modules use domain-specific stores

---

## Store Interaction Diagram

```
                      useWebSocket hook
                            │
          ┌─────────────────┼──────────────────────┐
          ▼                 ▼                      ▼
  useMarketStore    useAlertStore          useWalletStore
  .setChains()      .addAlert()            .setKpis()
                                           .setSystemHealth()
          │                 │                      │
          ▼                 ▼                      ▼
  MarketMatrix        AlertsFeed             Header / Sidebar
  (reads chains)      (reads alerts)         (reads kpis / health)

  ┌─────────────────────────────────────────────────────────┐
  │                   CommandTerminal                       │
  │   writes → useSolverStore.addTerminalOutput()           │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │                   RouteVisualizer                       │
  │   reads → useTerminalStore.activeRoute                  │
  │   or     useRouteStore.activeRoute                      │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │                   ExecutionBlotter                      │
  │   local state only (useState)                           │
  │   no Zustand store interaction for form state           │
  └─────────────────────────────────────────────────────────┘
```

---

## useState vs Zustand Usage

| Component | State Approach | Reason |
|-----------|---------------|--------|
| MarketMatrix | Zustand (market-store) + useState (columns) | Market data shared via WS; columns are local UI preference |
| ExecutionBlotter | useState (full form) | Form state is ephemeral, not shared |
| AiSolver | useState (recommendation) | Static demo data, no sharing needed |
| RouteVisualizer | Zustand (terminal-store) | Route data may come from API |
| LiquidityHeatmap | useState (chart/grid view toggle) | View preference only |
| SettlementInspector | useState (tx input, loading) | Ephemeral search state |
| CommandTerminal | Zustand (solver-store) + useState (history, input) | Terminal output shared; input/history are local |
| AlertsFeed | Zustand (alert-store) + useState (filter) | Alerts shared via WS; filter is local |
| Watchlist | Zustand (wallet-store) | Watchlist data shared with potential future features |
| Sidebar | Zustand (wallet-store, ui-store) | Health data from WS; collapse state from localStorage |
| Header | Zustand (wallet-store) | KPI data from WS |
