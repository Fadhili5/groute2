import { create } from "zustand";
import type { ExecutionOrder, SettlementData, LiquidityPool } from "@/types";

interface SolverState {
  orders: ExecutionOrder[];
  settlements: SettlementData[];
  liquidityPools: LiquidityPool[];
  terminalOutput: string[];
  addOrder: (order: ExecutionOrder) => void;
  updateOrder: (id: string, updates: Partial<ExecutionOrder>) => void;
  setOrders: (orders: ExecutionOrder[]) => void;
  addSettlement: (settlement: SettlementData) => void;
  setLiquidityPools: (pools: LiquidityPool[]) => void;
  addTerminalOutput: (line: string) => void;
  clearTerminal: () => void;
}

export const useSolverStore = create<SolverState>((set) => ({
  orders: [],
  settlements: [],
  liquidityPools: [],
  terminalOutput: [],
  addOrder: (order) => set((s) => ({ orders: [...s.orders, order] })),
  updateOrder: (id, updates) => set((s) => ({ orders: s.orders.map((o) => o.id === id ? { ...o, ...updates } : o) })),
  setOrders: (orders) => set({ orders }),
  addSettlement: (settlement) => set((s) => ({ settlements: [settlement, ...s.settlements].slice(0, 50) })),
  setLiquidityPools: (liquidityPools) => set({ liquidityPools }),
  addTerminalOutput: (line) => set((s) => ({ terminalOutput: [...s.terminalOutput, line].slice(-500) })),
  clearTerminal: () => set({ terminalOutput: [] }),
}));
