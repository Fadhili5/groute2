"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { MarketMatrix } from "@/components/market-matrix/MarketMatrix";
import { RouteVisualizer } from "@/components/route-visualizer/RouteVisualizer";
import { LiquidityHeatmap } from "@/components/liquidity-heatmap/LiquidityHeatmap";

export default function MarketMatrixPage() {
  return (
    <TerminalShell>
      <div className="grid grid-cols-12 gap-2 h-full">
        <div className="col-span-7 min-h-0">
          <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>
        </div>
        <div className="col-span-5 min-h-0">
          <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>
        </div>
        <div className="col-span-12 min-h-0">
          <ErrorBoundary name="Liquidity Heatmap"><LiquidityHeatmap /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
