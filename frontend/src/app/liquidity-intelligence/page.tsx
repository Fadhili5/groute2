"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LiquidityHeatmap } from "@/components/liquidity-heatmap/LiquidityHeatmap";
import { MarketMatrix } from "@/components/market-matrix/MarketMatrix";
import { Watchlist } from "@/components/watchlist/Watchlist";

export default function LiquidityIntelligencePage() {
  return (
    <TerminalShell>
      <div className="flex flex-col gap-2 h-full">
        <div className="flex gap-2 flex-[3] min-h-0">
          <div className="flex-[3] min-w-0">
            <ErrorBoundary name="Liquidity Heatmap"><LiquidityHeatmap /></ErrorBoundary>
          </div>
          <div className="flex-[2] min-w-0">
            <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>
          </div>
        </div>
        <div className="flex-shrink-0 max-h-48">
          <ErrorBoundary name="Watchlist"><Watchlist /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
