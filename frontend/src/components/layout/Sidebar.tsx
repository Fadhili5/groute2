"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutGrid, ArrowRightLeft, Route, Waves, FileCheck,
  Terminal, Bell, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useWalletStore, useUIStore } from "@/stores";

const NAV_ITEMS = [
  { icon: LayoutGrid, label: "Market Matrix", href: "/market-matrix" },
  { icon: ArrowRightLeft, label: "Execution Desk", href: "/execution-desk" },
  { icon: Route, label: "Route Analysis", href: "/route-analysis" },
  { icon: Waves, label: "Liquidity Intelligence", href: "/liquidity-intelligence" },
  { icon: FileCheck, label: "Settlement", href: "/settlement" },
  { icon: Terminal, label: "Command Terminal", href: "/command-terminal" },
  { icon: Bell, label: "Alerts", href: "/alerts" },
  { icon: Eye, label: "Watchlist", href: "/watchlist" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { systemHealth } = useWalletStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) useUIStore.getState().setSidebarCollapsed(saved === "true");
  }, []);

  const isActive = (href: string) => {
    if (href === "/market-matrix") return pathname === "/" || pathname === "/market-matrix";
    return pathname === href;
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-surface-900 border-r border-surface-800 z-50 flex flex-col transition-all duration-200",
      sidebarCollapsed ? "w-sidebar-collapsed" : "w-sidebar"
    )}>
      <div className={cn("h-header flex items-center border-b border-matrix-border flex-shrink-0", sidebarCollapsed ? "justify-center px-0" : "px-4")}>
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-surface-800 border border-surface-700 flex items-center justify-center">
              <span className="text-[10px] font-medium text-surface-400">G</span>
            </div>
            <div>
              <span className="text-sm font-medium text-surface-200">GhostRoute</span>
              <span className="text-[10px] text-surface-500 block leading-none">Terminal</span>
            </div>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link href="/">
            <div className="w-6 h-6 bg-surface-800 border border-surface-700 flex items-center justify-center">
              <span className="text-[10px] font-medium text-surface-400">G</span>
            </div>
          </Link>
        )}
      </div>

      <nav className={cn("flex-1 py-3 space-y-0.5 overflow-y-auto", sidebarCollapsed ? "px-1.5" : "px-2")}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={sidebarCollapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-xs transition-all",
              sidebarCollapsed && "justify-center px-1.5",
              isActive(item.href)
                ? "text-surface-200 bg-surface-800 font-medium"
                : "text-surface-500 hover:text-surface-300"
            )}
          >
            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center hover:bg-surface-700 transition-colors z-10"
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed
          ? <ChevronRight className="w-2.5 h-2.5 text-surface-400" />
          : <ChevronLeft className="w-2.5 h-2.5 text-surface-400" />
        }
      </button>

      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-t border-surface-800 space-y-2 flex-shrink-0">
          <div className="text-2xs text-surface-500 uppercase tracking-widest font-semibold mb-2">System Health</div>
          <div className="space-y-1.5">
            <HealthRow label="Network" status={systemHealth.network === "connected" ? "online" : "degraded"} />
            <HealthRow label="Relayers" status="online" value={`${systemHealth.relayers}`} />
            <HealthRow label="Block" status="online" value={`#${(systemHealth.blockHeight % 100000).toLocaleString()}`} />
            <HealthRow label="API" status={systemHealth.apiHealth === "healthy" ? "online" : "degraded"} />
          </div>
        </div>
      )}
    </aside>
  );
}

function HealthRow({ label, status, value }: { label: string; status: "online" | "degraded" | "offline"; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full", status === "online" && "bg-matrix-green", status === "degraded" && "bg-matrix-yellow", status === "offline" && "bg-matrix-red")} />
        <span className="text-2xs text-surface-500">{label}</span>
      </div>
      {value && <span className="text-2xs font-mono text-surface-400">{value}</span>}
    </div>
  );
}
