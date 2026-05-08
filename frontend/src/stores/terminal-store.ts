import { create } from "zustand";
import type {
  Chain,
  ExecutionOrder,
  Alert,
  WatchlistItem,
  SystemHealth,
  KPI,
  TickerItem,
  AIRecommendation,
  RouteVisualization,
  SettlementData,
  LiquidityPool,
} from "@/types";

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

  setChains: (chains: Chain[]) => void;
  setOrders: (orders: ExecutionOrder[]) => void;
  addOrder: (order: ExecutionOrder) => void;
  updateOrder: (id: string, updates: Partial<ExecutionOrder>) => void;
  addAlert: (alert: Alert) => void;
  markAlertRead: (id: string) => void;
  setWatchlist: (items: WatchlistItem[]) => void;
  setSystemHealth: (health: SystemHealth) => void;
  setKpis: (kpis: KPI) => void;
  setTicker: (ticker: TickerItem[]) => void;
  setActiveRoute: (route: RouteVisualization | null) => void;
  setAiRecommendation: (rec: AIRecommendation | null) => void;
  addSettlement: (settlement: SettlementData) => void;
  setLiquidityPools: (pools: LiquidityPool[]) => void;
  addTerminalOutput: (line: string) => void;
  clearTerminal: () => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  chains: [],
  orders: [],
  alerts: [],
  watchlist: [],
  systemHealth: {
    network: "connected",
    relayers: 12,
    blockHeight: 19876543,
    apiHealth: "healthy",
  },
  kpis: {
    tvl: 847_000_000,
    volume24h: 234_000_000,
    routesExecuted: 1847,
    mevProtected: 98.5,
  },
  ticker: [],
  activeRoute: null,
  aiRecommendation: null,
  settlements: [],
  liquidityPools: [],
  terminalOutput: [],

  setChains: (chains) => set({ chains }),
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((s) => ({ orders: [...s.orders, order] })),
  updateOrder: (id, updates) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })),
  addAlert: (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 100) })),
  markAlertRead: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
    })),
  setWatchlist: (watchlist) => set({ watchlist }),
  setSystemHealth: (systemHealth) => set({ systemHealth }),
  setKpis: (kpis) => set({ kpis }),
  setTicker: (ticker) => set({ ticker }),
  setActiveRoute: (activeRoute) => set({ activeRoute }),
  setAiRecommendation: (aiRecommendation) => set({ aiRecommendation }),
  addSettlement: (settlement) =>
    set((s) => ({ settlements: [settlement, ...s.settlements].slice(0, 50) })),
  setLiquidityPools: (liquidityPools) => set({ liquidityPools }),
  addTerminalOutput: (line) =>
    set((s) => ({
      terminalOutput: [...s.terminalOutput, line].slice(-500),
    })),
  clearTerminal: () => set({ terminalOutput: [] }),
}));
