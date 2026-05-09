"use client";

import { useState, useEffect } from "react";
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
import { TerminalShell } from "@/components/layout/TerminalShell";
import { useWebSocket } from "@/hooks/useWebSocket";

const NAV_LABELS = ["Market", "Execution", "Routes", "Liquidity", "Settlement", "Terminal", "Alerts", "Watchlist"];

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  useWebSocket();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div className="h-screen bg-matrix-bg flex flex-col">
        <div className="flex-shrink-0 h-[52px] bg-matrix-card border-b border-matrix-border flex items-center px-3 z-40">
          <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-ghost-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-white">G</span>
          </div>
          <span className="text-xs font-semibold text-surface-200 ml-2">GhostRoute</span>
          <div className="flex items-center gap-3 ml-auto">
            {NAV_LABELS.slice(0, 4).map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={`w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-semibold transition-colors ${activeTab === i ? "bg-surface-800 text-surface-200" : "text-surface-500 hover:text-surface-400"}`}
              >
                {label[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 0 && <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>}
          {activeTab === 1 && <ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary>}
          {activeTab === 2 && <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>}
          {activeTab === 3 && <ErrorBoundary name="Alerts Feed"><AlertsFeed /></ErrorBoundary>}
        </div>

        <div className="flex-shrink-0 bg-matrix-card border-t border-matrix-border">
          <div className="flex justify-around">
            {NAV_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-2 transition-colors ${activeTab === i ? "text-surface-200" : "text-surface-500"}`}
              >
                <span className="text-[11px]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
