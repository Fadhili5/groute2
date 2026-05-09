"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { MarketMatrix } from "@/components/market-matrix/MarketMatrix";
import { RouteVisualizer } from "@/components/route-visualizer/RouteVisualizer";
import { AiSolver } from "@/components/ai-solver/AiSolver";
import { ExecutionBlotter } from "@/components/execution-blotter/ExecutionBlotter";
import { LiquidityHeatmap } from "@/components/liquidity-heatmap/LiquidityHeatmap";
import { SettlementInspector } from "@/components/settlement-inspector/SettlementInspector";
import { CommandTerminal } from "@/components/command-terminal/CommandTerminal";
import { AlertsFeed } from "@/components/alerts-feed/AlertsFeed";
import { Watchlist } from "@/components/watchlist/Watchlist";

export default function Home() {
  return (
    <TerminalShell>
      <div className="grid grid-cols-12 gap-2 h-full" style={{ gridTemplateRows: "42fr 34fr 1fr" }}>
        <div className="col-span-4 row-span-1 min-h-0">
          <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>
        </div>
        <div className="col-span-5 row-span-1 min-h-0">
          <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>
        </div>
        <div className="col-span-3 row-span-1 min-h-0">
          <ErrorBoundary name="AI Solver"><AiSolver /></ErrorBoundary>
        </div>

        <div className="col-span-4 row-span-1 min-h-0">
          <ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary>
        </div>
        <div className="col-span-5 row-span-1 min-h-0">
          <ErrorBoundary name="Liquidity Heatmap"><LiquidityHeatmap /></ErrorBoundary>
        </div>
        <div className="col-span-3 row-span-1 min-h-0">
          <ErrorBoundary name="Settlement Inspector"><SettlementInspector /></ErrorBoundary>
        </div>

        <div className="col-span-4 row-span-1 min-h-0">
          <ErrorBoundary name="Command Terminal"><CommandTerminal /></ErrorBoundary>
        </div>
        <div className="col-span-5 row-span-1 min-h-0">
          <ErrorBoundary name="Alerts Feed"><AlertsFeed /></ErrorBoundary>
        </div>
        <div className="col-span-3 row-span-1 min-h-0">
          <ErrorBoundary name="Watchlist"><Watchlist /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
