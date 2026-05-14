import { create } from "zustand";
import type { Chain } from "@/types";

interface MarketState {
  chains: Chain[];
  loading: boolean;
  error: string | null;
  lastFetch: number;
  setChains: (chains: Chain[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  chains: [],
  loading: false,
  error: null,
  lastFetch: 0,
  setChains: (chains) => set({ chains, lastFetch: Date.now() }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
