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

const TABS = [
  { id: "market", label: "MARKET", module: "MarketMatrix" },
  { id: "execution", label: "EXECUTION", module: "ExecutionBlotter" },
  { id: "routes", label: "ROUTES", module: "RouteVisualizer" },
  { id: "liquidity", label: "LIQUIDITY", module: "LiquidityHeatmap" },
  { id: "settlement", label: "SETTLEMENT", module: "SettlementInspector" },
  { id: "terminal", label: "TERMINAL", module: "CommandTerminal" },
  { id: "alerts", label: "ALERTS", module: "AlertsFeed" },
  { id: "watchlist", label: "WATCHLIST", module: "Watchlist" },
];

const SIDEBAR_MODULES = ["AiSolver"];

export default function Home() {
  const [activeTab, setActiveTab] = useState("market");
  const [isMobile, setIsMobile] = useState(false);

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
          <div className="w-5 h-5 rounded bg-surface-800 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-surface-400">G</span>
          </div>
          <span className="text-xs font-semibold text-surface-200 ml-2">GhostRoute</span>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === "market" && <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>}
          {activeTab === "execution" && <ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary>}
          {activeTab === "routes" && <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>}
          {activeTab === "liquidity" && <ErrorBoundary name="Liquidity Heatmap"><LiquidityHeatmap /></ErrorBoundary>}
        </div>

        <div className="flex-shrink-0 bg-matrix-card border-t border-matrix-border">
          <div className="flex justify-around">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-2 transition-colors ${activeTab === tab.id ? "text-surface-200" : "text-surface-500"}`}
              >
                <span className="text-[11px]">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderModule = (module: string) => {
    switch (module) {
      case "MarketMatrix": return <MarketMatrix />;
      case "RouteVisualizer": return <RouteVisualizer />;
      case "ExecutionBlotter": return <ExecutionBlotter />;
      case "LiquidityHeatmap": return <LiquidityHeatmap />;
      case "SettlementInspector": return <SettlementInspector />;
      case "CommandTerminal": return <CommandTerminal />;
      case "AlertsFeed": return <AlertsFeed />;
      case "Watchlist": return <Watchlist />;
      default: return null;
    }
  };

  return (
    <TerminalShell>
      <div className="flex h-full gap-4">
        <div className="flex-1 flex flex-col min-w-0">
          <nav className="flex gap-1 mb-4 px-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "text-surface-200 border-matrix-green"
                    : "text-surface-500 border-transparent hover:text-surface-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="flex-1 min-h-0">
            <ErrorBoundary name={activeTab}>
              {renderModule(TABS.find(t => t.id === activeTab)?.module || "MarketMatrix")}
            </ErrorBoundary>
          </div>
        </div>

        <div className="w-80 flex flex-col gap-4 flex-shrink-0">
          <div className="flex-shrink-0">
            <ErrorBoundary name="AI Solver"><AiSolver /></ErrorBoundary>
          </div>
          <div className="flex-1 min-h-0">
            <ErrorBoundary name="Watchlist"><Watchlist /></ErrorBoundary>
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}
