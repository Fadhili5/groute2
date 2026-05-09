"use client";

import { Search, Bell, Wallet, ChevronDown } from "lucide-react";
import { useWalletStore } from "@/stores";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function Header() {
  const { kpis } = useWalletStore();

  return (
    <header className="fixed top-0 left-sidebar right-0 h-header bg-matrix-card border-b border-matrix-border z-40 flex items-center px-4 gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-ghost-500 to-cyan-400 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">G</span>
          </div>
          <span className="text-xs font-semibold text-surface-300 tracking-tight">GhostRoute</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center max-w-xl mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-600" />
          <input
            type="text"
            placeholder="Search chains, routes, transactions..."
            className="w-full bg-matrix-bg border border-surface-800 rounded-sm pl-8 pr-3 py-1.5 text-xs text-surface-300 placeholder-surface-600 focus:outline-none focus:border-ghost-700/50 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <KpiBlock label="TVL" value={formatCurrency(kpis.tvl, 1)} />
        <div className="w-px h-4 bg-surface-800" />
        <KpiBlock label="24H Vol" value={formatCurrency(kpis.volume24h, 1)} />
        <div className="w-px h-4 bg-surface-800" />
        <KpiBlock label="Routes" value={formatNumber(kpis.routesExecuted, 0)} />
        <div className="w-px h-4 bg-surface-800" />
        <KpiBlock label="MEV Protected" value={`${kpis.mevProtected}%`} />
      </div>

      <div className="flex items-center gap-2 ml-2">
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-surface-800 bg-matrix-bg hover:bg-surface-800/50 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-matrix-green" />
          <span className="text-2xs font-mono text-surface-400">ETH</span>
          <ChevronDown className="w-3 h-3 text-surface-600" />
        </button>

        <button className="relative p-1.5 rounded-sm hover:bg-surface-800/50 transition-colors">
          <Bell className="w-3.5 h-3.5 text-surface-500" />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-matrix-red" />
        </button>

        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-ghost-700/50 bg-ghost-950/50 hover:bg-ghost-900/50 transition-colors">
          <Wallet className="w-3 h-3 text-ghost-400" />
          <span className="text-2xs font-mono text-ghost-400 font-medium">0x1a2b...3c4d</span>
        </button>
      </div>
    </header>
  );
}

function KpiBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-2xs text-surface-500 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-mono font-semibold text-surface-200">{value}</span>
    </div>
  );
}
