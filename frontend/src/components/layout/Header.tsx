"use client";

import { Search, Bell, Wallet, ChevronDown } from "lucide-react";
import { useWalletStore } from "@/stores";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function Header() {
  const { kpis } = useWalletStore();

  return (
    <header className="fixed top-0 left-sidebar right-0 h-header bg-surface-900 border-b border-surface-800 z-40 flex items-center px-4 gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-surface-800 flex items-center justify-center border border-surface-700">
            <span className="text-[9px] font-medium text-surface-400">G</span>
          </div>
          <span className="text-xs font-medium text-surface-300">GhostRoute</span>
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
  <button className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-surface-800 bg-surface-800 hover:bg-surface-700 transition-colors">
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-matrix-green" />
      <span className="text-xs font-mono text-surface-400">ETH</span>
    </div>
    <ChevronDown className="w-3 h-3 text-surface-600" />
  </button>

  <button className="relative p-2 rounded-sm hover:bg-surface-800/50 transition-colors">
    <Bell className="w-3.5 h-3.5 text-surface-500" />
    <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-matrix-red" />
  </button>

  <button className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-surface-700 bg-surface-800 hover:bg-surface-700 transition-colors">
    <div className="flex items-center gap-2">
      <Wallet className="w-3 h-3 text-surface-400" />
      <span className="text-xs font-mono text-surface-300">0x1a2b...3c4d</span>
    </div>
  </button>
</div>
    </header>
  );
}

function KpiBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-2xs text-surface-600">{label}</span>
      <span className="text-xs font-mono text-surface-300">{value}</span>
    </div>
  );
}
