"use client";

import { useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridOptions } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useTerminalStore } from "@/stores/terminal-store";
import { cn } from "@/lib/utils";
import type { Chain } from "@/types";

ModuleRegistry.registerModules([AllCommunityModule]);

const CHAIN_DATA: Chain[] = [
  { id: "ethereum", name: "Ethereum", shortName: "ETH", liquidity: 842_000_000, spread: 0.02, gas: 12.4, bridgeFee: 0.05, slippage: 0.01, latency: 12, privacy: 85, mev: 92, eta: "12s", status: "healthy" },
  { id: "arbitrum", name: "Arbitrum", shortName: "ARB", liquidity: 456_000_000, spread: 0.03, gas: 0.08, bridgeFee: 0.03, slippage: 0.02, latency: 3, privacy: 78, mev: 85, eta: "8s", status: "healthy" },
  { id: "base", name: "Base", shortName: "BASE", liquidity: 234_000_000, spread: 0.04, gas: 0.06, bridgeFee: 0.04, slippage: 0.03, latency: 2, privacy: 72, mev: 80, eta: "6s", status: "healthy" },
  { id: "solana", name: "Solana", shortName: "SOL", liquidity: 678_000_000, spread: 0.01, gas: 0.0002, bridgeFee: 0.02, slippage: 0.01, latency: 1, privacy: 45, mev: 60, eta: "4s", status: "healthy" },
  { id: "avalanche", name: "Avalanche", shortName: "AVAX", liquidity: 189_000_000, spread: 0.05, gas: 0.15, bridgeFee: 0.06, slippage: 0.04, latency: 5, privacy: 70, mev: 75, eta: "10s", status: "degraded" },
  { id: "bnb", name: "BNB Chain", shortName: "BNB", liquidity: 312_000_000, spread: 0.03, gas: 0.04, bridgeFee: 0.04, slippage: 0.02, latency: 4, privacy: 55, mev: 65, eta: "7s", status: "healthy" },
];

export function MarketMatrix() {
  const { chains, setChains } = useTerminalStore();
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    setChains(CHAIN_DATA);
  }, [setChains]);

  const colDefs: ColDef[] = [
    {
      field: "shortName",
      headerName: "Chain",
      width: 50,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-1.5 h-full">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            params.data.status === "healthy" ? "bg-matrix-green" : "bg-matrix-yellow"
          )} />
          <span className="font-semibold text-surface-200">{params.value}</span>
        </div>
      ),
    },
    {
      field: "liquidity",
      headerName: "Liquidity",
      width: 85,
      valueFormatter: (p: any) => {
        if (p.value >= 1e9) return `$${(p.value / 1e9).toFixed(1)}B`;
        if (p.value >= 1e6) return `$${(p.value / 1e6).toFixed(0)}M`;
        return `$${(p.value / 1e3).toFixed(0)}K`;
      },
      cellStyle: { color: "#22d3ee" },
    },
    {
      field: "spread",
      headerName: "Spread",
      width: 60,
      valueFormatter: (p: any) => `${p.value.toFixed(2)}%`,
      cellStyle: (p: any) => p.value <= 0.03 ? { color: "#10b981" } : { color: "#f59e0b" },
    },
    {
      field: "gas",
      headerName: "Gas",
      width: 65,
      valueFormatter: (p: any) => p.value < 1 ? `${p.value} gwei` : `${p.value.toFixed(1)} gwei`,
      cellStyle: (p: any) => p.value < 1 ? { color: "#10b981" } : { color: "#ef4444" },
    },
    {
      field: "bridgeFee",
      headerName: "Bridge",
      width: 60,
      valueFormatter: (p: any) => `${p.value.toFixed(2)}%`,
    },
    {
      field: "slippage",
      headerName: "Slippage",
      width: 65,
      valueFormatter: (p: any) => `${p.value.toFixed(2)}%`,
      cellStyle: (p: any) => p.value <= 0.02 ? { color: "#10b981" } : { color: "#f59e0b" },
    },
    {
      field: "latency",
      headerName: "Latency",
      width: 60,
      valueFormatter: (p: any) => `${p.value}s`,
      cellStyle: (p: any) => p.value <= 5 ? { color: "#10b981" } : p.value <= 10 ? { color: "#f59e0b" } : { color: "#ef4444" },
    },
    {
      field: "privacy",
      headerName: "Privacy",
      width: 60,
      valueFormatter: (p: any) => `${p.value}`,
      cellStyle: (p: any) => p.value >= 70 ? { color: "#22d3ee" } : { color: "#f59e0b" },
    },
    {
      field: "mev",
      headerName: "MEV",
      width: 55,
      valueFormatter: (p: any) => `${p.value}`,
      cellStyle: (p: any) => p.value >= 80 ? { color: "#10b981" } : { color: "#f59e0b" },
    },
    {
      field: "eta",
      headerName: "ETA",
      width: 55,
    },
  ];

  const gridOptions: GridOptions = {
    suppressMovableColumns: true,
    suppressCellFocus: true,
    headerHeight: 28,
    rowHeight: 28,
    rowClass: "ag-theme-ghost",
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Market Matrix</span>
        <span className="panel-badge bg-matrix-green/10 text-matrix-green text-2xs">Live</span>
      </div>
      <div className="flex-1 ag-theme-ghost">
        <AgGridReact
          ref={gridRef}
          rowData={CHAIN_DATA}
          columnDefs={colDefs}
          gridOptions={gridOptions}
          domLayout="autoHeight"
          suppressHorizontalScroll={false}
        />
      </div>
      <style jsx global>{`
        .ag-theme-ghost .ag-root-wrapper {
          border: none !important;
        }
      `}</style>
    </div>
  );
}
