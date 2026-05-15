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
import { RecentExecutions } from "@/components/recent-executions/RecentExecutions";
import { TerminalShell } from "@/components/layout/TerminalShell";

const TABS = [
  { id: "top", label: "TOP", module: "Top" },
  { id: "middle", label: "MIDDLE", module: "Middle" },
  { id: "bottom", label: "BOTTOM", module: "Bottom" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("top");
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

        <div className="flex-1 overflow-hidden px-2 py-2">
          {activeTab === "top" && (
            <div className="grid grid-cols-12 gap-2 h-full">
              <div className="col-span-12 min-h-0"><ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary></div>
            </div>
          )}
          {activeTab === "middle" && (
            <div className="grid grid-cols-12 gap-2 h-full">
              <div className="col-span-12 min-h-0"><ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary></div>
            </div>
          )}
          {activeTab === "bottom" && (
            <div className="grid grid-cols-12 gap-2 h-full">
              <div className="col-span-12 min-h-0"><ErrorBoundary name="Command Terminal"><CommandTerminal /></ErrorBoundary></div>
            </div>
          )}
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

  return (
    <TerminalShell>
      <div className="grid grid-cols-12 grid-rows-3 gap-2 h-full">
        <div className="col-span-6 row-span-1 min-h-0">
          <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>
        </div>
        <div className="col-span-3 row-span-1 min-h-0">
          <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>
        </div>
        <div className="col-span-3 row-span-1 min-h-0">
          <ErrorBoundary name="AI Solver"><AiSolver /></ErrorBoundary>
        </div>

        <div className="col-span-5 row-span-1 min-h-0">
          <ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary>
        </div>
        <div className="col-span-4 row-span-1 min-h-0">
          <ErrorBoundary name="Liquidity Heatmap"><LiquidityHeatmap /></ErrorBoundary>
        </div>
        <div className="col-span-3 row-span-1 min-h-0">
          <ErrorBoundary name="Settlement Inspector"><SettlementInspector /></ErrorBoundary>
        </div>

        <div className="col-span-5 row-span-1 min-h-0">
          <ErrorBoundary name="Command Terminal"><CommandTerminal /></ErrorBoundary>
        </div>
        <div className="col-span-3 row-span-1 min-h-0">
          <ErrorBoundary name="Alerts Feed"><AlertsFeed /></ErrorBoundary>
        </div>
        <div className="col-span-4 row-span-1 min-h-0">
          <ErrorBoundary name="Recent Executions"><RecentExecutions /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
