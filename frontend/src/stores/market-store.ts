import { create } from "zustand";
import type { Chain } from "@/types";

interface MarketState {
  chains: Chain[];
  loading: boolean;
  error: string | null;
  setChains: (chains: Chain[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  chains: [],
  loading: false,
  error: null,
  setChains: (chains) => set({ chains }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
