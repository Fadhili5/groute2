import { create } from "zustand";
import { api } from "@/lib/api-client";

interface Solver {
  id: string;
  address: string;
  name: string;
  stakedAmount: number;
  totalSolved: number;
  successRate: number;
  averageExecutionTime: number;
  isActive: boolean;
  registeredAt: number;
}

interface Auction {
  id: string;
  intentId: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  startPrice: number;
  currentPrice: number;
  endPrice: number;
  deadline: number;
  state: "Created" | "Bidding" | "Closed" | "Settled" | "Cancelled";
  winner: string | null;
  finalPrice: number | null;
  settledAt: number | null;
  bids?: any[];
}

interface Bid {
  id: string;
  auctionId: string;
  solver: string;
  price: number;
  estimatedGas: number;
  executionTime: number;
  routeId: string;
  state: "Submitted" | "Accepted" | "Rejected" | "Expired";
  submittedAt: number;
}

interface SolverMarketState {
  solvers: Solver[];
  auctions: Auction[];
  leaderboard: any[];
  stats: any;
  selectedAuction: Auction | null;
  isLoading: boolean;
  error: string | null;
  fetchSolvers: () => Promise<void>;
  fetchAuctions: (state?: string) => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createAuction: (data: { intentId: string; tokenIn: string; tokenOut: string; amountIn: number; startPrice: number }) => Promise<Auction>;
  submitBid: (data: { auctionId: string; price: number; estimatedGas: number; executionTime: number; routeId: string }) => Promise<Bid>;
  settleAuction: (auctionId: string) => Promise<any>;
  setSelectedAuction: (auction: Auction | null) => void;
}

export const useSolverMarketStore = create<SolverMarketState>((set, get) => ({
  solvers: [],
  auctions: [],
  leaderboard: [],
  stats: null,
  selectedAuction: null,
  isLoading: false,
  error: null,

  fetchSolvers: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getSolvers();
      set({ solvers: data.solvers, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchAuctions: async (state?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getAuctions({ state });
      set({ auctions: data.auctions, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchLeaderboard: async () => {
    try {
      const data = await api.getLeaderboard();
      set({ leaderboard: data.leaderboard });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchStats: async () => {
    try {
      const data = await api.getSolverStats();
      set({ stats: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createAuction: async (data) => {
    const auction = await api.createAuction(data);
    set((s) => ({ auctions: [auction, ...s.auctions] }));
    return auction;
  },

  submitBid: async (data) => {
    const bid = await api.submitBid(data);
    const { auctions } = get();
    const updated = auctions.map((a) =>
      a.id === data.auctionId ? { ...a, bids: [...(a.bids || []), bid] } : a
    );
    set({ auctions: updated });
    return bid;
  },

  settleAuction: async (auctionId) => {
    const result = await api.settleAuction(auctionId);
    const { auctions } = get();
    const updated = auctions.map((a) => (a.id === auctionId ? { ...a, ...result } : a));
    set({ auctions: updated });
    return result;
  },

  setSelectedAuction: (auction) => set({ selectedAuction: auction }),
}));