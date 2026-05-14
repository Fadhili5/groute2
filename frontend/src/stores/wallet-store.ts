import { create } from "zustand";
import type { SystemHealth, KPI, TickerItem, WatchlistItem } from "@/types";

interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  watchlist: WatchlistItem[];
  systemHealth: SystemHealth;
  kpis: KPI;
  ticker: TickerItem[];
  connect: () => void;
  disconnect: () => void;
  setWatchlist: (items: WatchlistItem[]) => void;
  setSystemHealth: (health: SystemHealth) => void;
  setKpis: (kpis: KPI) => void;
  setTicker: (ticker: TickerItem[]) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  connected: false,
  address: null,
  balance: 0,
  watchlist: [],
  systemHealth: { network: "connected", relayers: 12, blockHeight: 0, apiHealth: "healthy" },
  kpis: { tvl: 0, volume24h: 0, routesExecuted: 0, mevProtected: 0 },
  ticker: [],
  connect: () => set({ connected: true, address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", balance: 100000 }),
  disconnect: () => set({ connected: false, address: null, balance: 0 }),
  setWatchlist: (watchlist) => set({ watchlist }),
  setSystemHealth: (systemHealth) => set({ systemHealth }),
  setKpis: (kpis) => set({ kpis }),
  setTicker: (ticker) => set({ ticker }),
}));
