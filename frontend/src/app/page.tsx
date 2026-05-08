"use client";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
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
            <ErrorBoundary name="Market Matrix">
              <MarketMatrix />
            </ErrorBoundary>
          </div>
          <div className="col-span-5">
            <ErrorBoundary name="Route Visualizer">
              <RouteVisualizer />
            </ErrorBoundary>
          </div>
          <div className="col-span-3">
            <ErrorBoundary name="AI Solver">
              <AiSolver />
            </ErrorBoundary>
          </div>

          <div className="col-span-4">
            <ErrorBoundary name="Execution Blotter">
              <ExecutionBlotter />
            </ErrorBoundary>
          </div>
          <div className="col-span-5">
            <ErrorBoundary name="Liquidity Heatmap">
              <LiquidityHeatmap />
            </ErrorBoundary>
          </div>
          <div className="col-span-3">
            <ErrorBoundary name="Settlement Inspector">
              <SettlementInspector />
            </ErrorBoundary>
          </div>

          <div className="col-span-4">
            <ErrorBoundary name="Command Terminal">
              <CommandTerminal />
            </ErrorBoundary>
          </div>
          <div className="col-span-5">
            <ErrorBoundary name="Alerts Feed">
              <AlertsFeed />
            </ErrorBoundary>
          </div>
          <div className="col-span-3">
            <ErrorBoundary name="Watchlist">
              <Watchlist />
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
