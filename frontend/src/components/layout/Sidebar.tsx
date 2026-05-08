"use client";

import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  ArrowRightLeft,
  Route,
  Waves,
  FileCheck,
  Terminal,
  Bell,
  Eye,
  Activity,
  Radio,
  Cpu,
  HeartPulse,
} from "lucide-react";
import { useTerminalStore } from "@/stores/terminal-store";

const NAV_ITEMS = [
  { icon: LayoutGrid, label: "Market Matrix", id: "market-matrix" },
  { icon: ArrowRightLeft, label: "Execution Desk", id: "execution-desk" },
  { icon: Route, label: "Route Analysis", id: "route-analysis" },
  { icon: Waves, label: "Liquidity Intelligence", id: "liquidity-intelligence" },
  { icon: FileCheck, label: "Settlement", id: "settlement" },
  { icon: Terminal, label: "Command Terminal", id: "command-terminal" },
  { icon: Bell, label: "Alerts", id: "alerts" },
  { icon: Eye, label: "Watchlist", id: "watchlist" },
];

export function Sidebar() {
  const { systemHealth } = useTerminalStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-matrix-card border-r border-matrix-border z-50 flex flex-col">
      <div className="h-header flex items-center px-4 border-b border-matrix-border">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-ghost-500 to-cyan-400 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">G</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-surface-200 tracking-tight">
              GhostRoute
            </span>
            <span className="text-[10px] text-surface-500 block leading-none">
              Terminal
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs transition-all",
              "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50",
              "font-medium tracking-wide"
            )}
          >
            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-matrix-border space-y-2">
        <div className="text-2xs text-surface-500 uppercase tracking-widest font-semibold mb-2">
          System Health
        </div>
        <div className="space-y-1.5">
          <HealthRow
            label="Network"
            status={systemHealth.network === "connected" ? "online" : systemHealth.network === "degraded" ? "degraded" : "offline"}
          />
          <HealthRow
            label="Relayers"
            status="online"
            value={`${systemHealth.relayers}`}
          />
          <HealthRow
            label="Block"
            status="online"
            value={`#${(systemHealth.blockHeight % 100000).toLocaleString()}`}
          />
          <HealthRow
            label="API"
            status={systemHealth.apiHealth === "healthy" ? "online" : systemHealth.apiHealth === "degraded" ? "degraded" : "offline"}
          />
        </div>
      </div>
    </aside>
  );
}

function HealthRow({
  label,
  status,
  value,
}: {
  label: string;
  status: "online" | "degraded" | "offline";
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            status === "online" && "bg-matrix-green",
            status === "degraded" && "bg-matrix-yellow",
            status === "offline" && "bg-matrix-red"
          )}
        />
        <span className="text-2xs text-surface-500">{label}</span>
      </div>
      {value && (
        <span className="text-2xs font-mono text-surface-400">{value}</span>
      )}
    </div>
  );
}
