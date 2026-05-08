"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusStrip } from "@/components/layout/StatusStrip";
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
    <div className="min-h-screen bg-matrix-bg">
      <Sidebar />
      <Header />
      <StatusStrip />

      <main className="fixed top-header left-sidebar right-0 bottom-status overflow-hidden p-2">
        <div className="grid grid-cols-12 gap-2 h-full">
          <div className="col-span-4">
            <MarketMatrix />
          </div>
          <div className="col-span-5">
            <RouteVisualizer />
          </div>
          <div className="col-span-3">
            <AiSolver />
          </div>

          <div className="col-span-4">
            <ExecutionBlotter />
          </div>
          <div className="col-span-5">
            <LiquidityHeatmap />
          </div>
          <div className="col-span-3">
            <SettlementInspector />
          </div>

          <div className="col-span-4">
            <CommandTerminal />
          </div>
          <div className="col-span-5">
            <AlertsFeed />
          </div>
          <div className="col-span-3">
            <Watchlist />
          </div>
        </div>
      </main>
    </div>
  );
}
