"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TickerItem } from "@/types";

const DEFAULT_TICKER: TickerItem[] = [
  { type: "chain", message: "ETH: block 19876543 | gas 12.4 gwei" },
  { type: "chain", message: "ARB: block 187654321 | gas 0.08 gwei" },
  { type: "route", message: "Route 0x7f3c completed: 50000 USDC ARB \u2192 ETH (12.4s)" },
  { type: "alert", message: "MEV protection engaged on Ethereum mempool", severity: "warning" },
  { type: "bridge", message: "LayerZero: 3 active relays | 0 pending" },
  { type: "gas", message: "Base gas spike: 3.2 gwei (+240%)" },
];

export function StatusStrip() {
  const [items] = useState<TickerItem[]>(DEFAULT_TICKER);

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-status bg-surface-900 border-t border-surface-800 z-50 flex items-center overflow-hidden">
      <div className="flex items-center gap-2 px-3 border-r border-surface-800 h-full flex-shrink-0">
        <span className="text-2xs font-mono text-surface-600">LIVE</span>
        <span className="w-1.5 h-1.5 rounded-full bg-matrix-green" />
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="flex items-center h-full ticker-track whitespace-nowrap animate-ticker">
          {[...items, ...items].map((item, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1.5 mx-4 text-2xs font-mono",
                item.severity === "warning" && "text-matrix-yellow",
                item.severity === "critical" && "text-matrix-red",
                !item.severity && "text-surface-400"
              )}
            >
              {item.severity && (
                <span className={cn(
                  "w-1 h-1 rounded-full inline-block",
                  item.severity === "warning" && "bg-matrix-yellow",
                  item.severity === "critical" && "bg-matrix-red"
                )} />
              )}
              {item.message}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
