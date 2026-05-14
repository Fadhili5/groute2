"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWalletStore } from "@/stores";
import { api } from "@/lib/api-client";
import { TrendingUp, TrendingDown, Eye, EyeOff, Loader2 } from "lucide-react";
import type { WatchlistItem } from "@/types";

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "USDC", name: "USD Coin", price: 1.00, pnl: 0.01, chain: "Ethereum", change24h: 0.01 },
  { symbol: "ETH", name: "Ether", price: 3452.80, pnl: 124.50, chain: "Ethereum", change24h: 3.72 },
  { symbol: "BTC", name: "Bitcoin", price: 67891.20, pnl: -245.30, chain: "Ethereum", change24h: -0.36 },
  { symbol: "SOL", name: "Solana", price: 142.65, pnl: 8.42, chain: "Solana", change24h: 6.28 },
  { symbol: "AVAX", name: "Avalanche", price: 34.21, pnl: -1.85, chain: "Avalanche", change24h: -5.13 },
  { symbol: "ARB", name: "Arbitrum", price: 1.08, pnl: 0.04, chain: "Arbitrum", change24h: 3.85 },
  { symbol: "BNB", name: "BNB", price: 578.30, pnl: 12.40, chain: "BNB Chain", change24h: 2.19 },
];

export function Watchlist() {
  const { watchlist, setWatchlist } = useWalletStore();
  const items = watchlist.length > 0 ? watchlist : DEFAULT_WATCHLIST;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Watchlist</span>
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3 text-surface-500" />
          <span className="text-2xs text-surface-500">{items.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {items.map((item) => (
          <div
            key={item.symbol}
            className="flex items-center px-3 py-1.5 border-b border-surface-900/50 hover:bg-surface-800/20 transition-colors"
          >
            <div className="w-6 h-6 rounded-sm bg-matrix-bg border border-surface-800 flex items-center justify-center mr-2.5">
              <span className="text-2xs font-bold text-surface-400">{item.symbol.slice(0, 2)}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-surface-200">{item.symbol}</span>
                <span className="text-2xs text-surface-600">{item.name}</span>
              </div>
              <span className="text-2xs text-surface-600 font-mono">{item.chain}</span>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-semibold text-surface-200">
                ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={cn(
                "flex items-center gap-0.5 justify-end text-2xs font-mono",
                item.pnl >= 0 ? "text-matrix-green" : "text-matrix-red"
              )}>
                {item.pnl >= 0 ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                {item.change24h >= 0 ? "+" : ""}{item.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 px-3 py-1.5 border-t border-matrix-border">
        <button className="w-full text-2xs text-surface-600 hover:text-surface-400 flex items-center justify-center gap-1">
          <EyeOff className="w-2.5 h-2.5" />
          Manage watchlist
        </button>
      </div>
    </div>
  );
}
