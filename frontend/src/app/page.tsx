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
import { LayoutGrid, ArrowRightLeft, Route, Waves, FileCheck, Terminal, Bell, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useWebSocket } from "@/hooks/useWebSocket";

const TABS = [
  { icon: LayoutGrid, label: "Market", href: "/market-matrix" },
  { icon: ArrowRightLeft, label: "Execution", href: "/execution-desk" },
  { icon: Route, label: "Routes", href: "/route-analysis" },
  { icon: Waves, label: "Liquidity", href: "/liquidity-intelligence" },
  { icon: FileCheck, label: "Settlement", href: "/settlement" },
  { icon: Terminal, label: "Terminal", href: "/command-terminal" },
  { icon: Bell, label: "Alerts", href: "/alerts" },
  { icon: Eye, label: "Watchlist", href: "/watchlist" },
];

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
        <div className="flex-shrink-0 h-[52px] bg-matrix-card border-b border-matrix-border flex items-center px-3 gap-2 z-40">
          <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-ghost-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-white">G</span>
          </div>
          <span className="text-xs font-semibold text-surface-200">GhostRoute</span>
          <div className="flex items-center gap-1 ml-auto">
            {TABS.slice(0, 4).map((tab, i) => (
              <button
                key={tab.href}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "p-1.5 rounded-sm transition-colors",
                  activeTab === i ? "bg-surface-800 text-surface-200" : "text-surface-500"
                )}
              >
                <tab.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 0 && (
            <div className="h-full flex flex-col">
              <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>
            </div>
          )}
          {activeTab === 1 && (
            <div className="h-full flex flex-col">
              <ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary>
            </div>
          )}
          {activeTab === 2 && (
            <div className="h-full flex flex-col">
              <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>
            </div>
          )}
          {activeTab === 3 && (
            <div className="h-full flex flex-col">
              <ErrorBoundary name="Alerts Feed"><AlertsFeed /></ErrorBoundary>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 bg-matrix-card border-t border-matrix-border px-2 py-1">
          <div className="flex justify-around">
            {TABS.map((tab, i) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-2 rounded-sm transition-colors",
                  "text-surface-500 hover:text-surface-300"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[10px]">{tab.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-2 h-full" style={{ gridTemplateRows: "42fr 34fr 1fr" }}>
      {/* Row 1 */}
      <div className="col-span-4 row-span-1 min-h-0">
        <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>
      </div>
      <div className="col-span-5 row-span-1 min-h-0">
        <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>
      </div>
      <div className="col-span-3 row-span-1 min-h-0">
        <ErrorBoundary name="AI Solver"><AiSolver /></ErrorBoundary>
      </div>

      {/* Row 2 */}
      <div className="col-span-4 row-span-1 min-h-0">
        <ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary>
      </div>
      <div className="col-span-5 row-span-1 min-h-0">
        <ErrorBoundary name="Liquidity Heatmap"><LiquidityHeatmap /></ErrorBoundary>
      </div>
      <div className="col-span-3 row-span-1 min-h-0">
        <ErrorBoundary name="Settlement Inspector"><SettlementInspector /></ErrorBoundary>
      </div>

      {/* Row 3 */}
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
  );
}
