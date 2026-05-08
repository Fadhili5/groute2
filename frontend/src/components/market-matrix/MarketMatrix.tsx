"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridOptions, GridReadyEvent } from "ag-grid-community";
import { cn } from "@/lib/utils";
import type { Chain } from "@/types";

const CHAIN_DATA: Chain[] = [
  { id: "ethereum", name: "Ethereum", shortName: "ETH", liquidity: 842_000_000, spread: 0.02, gas: 12.4, bridgeFee: 0.05, slippage: 0.01, latency: 12, privacy: 85, mev: 92, eta: "12s", status: "healthy" },
  { id: "arbitrum", name: "Arbitrum", shortName: "ARB", liquidity: 456_000_000, spread: 0.03, gas: 0.08, bridgeFee: 0.03, slippage: 0.02, latency: 3, privacy: 78, mev: 85, eta: "8s", status: "healthy" },
  { id: "base", name: "Base", shortName: "BASE", liquidity: 234_000_000, spread: 0.04, gas: 0.06, bridgeFee: 0.04, slippage: 0.03, latency: 2, privacy: 72, mev: 80, eta: "6s", status: "healthy" },
  { id: "solana", name: "Solana", shortName: "SOL", liquidity: 678_000_000, spread: 0.01, gas: 0.0002, bridgeFee: 0.02, slippage: 0.01, latency: 1, privacy: 45, mev: 60, eta: "4s", status: "healthy" },
  { id: "avalanche", name: "Avalanche", shortName: "AVAX", liquidity: 189_000_000, spread: 0.05, gas: 0.15, bridgeFee: 0.06, slippage: 0.04, latency: 5, privacy: 70, mev: 75, eta: "10s", status: "degraded" },
  { id: "bnb", name: "BNB Chain", shortName: "BNB", liquidity: 312_000_000, spread: 0.03, gas: 0.04, bridgeFee: 0.04, slippage: 0.02, latency: 4, privacy: 55, mev: 65, eta: "7s", status: "healthy" },
];

export function MarketMatrix() {
  const gridRef = useRef<AgGridReact>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    try {
      params.api.sizeColumnsToFit();
    } catch {
      setError("Failed to initialize grid");
    }
  }, []);

  const colDefs: ColDef[] = [
    {
      field: "shortName",
      headerName: "Chain",
      width: 55,
      cellRenderer: (params: any) => {
        if (!params?.data) return null;
        return (
          <div className="flex items-center gap-1.5 h-full">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              params.data.status === "healthy" ? "bg-matrix-green" : params.data.status === "degraded" ? "bg-matrix-yellow" : "bg-matrix-red"
            )} />
            <span className="font-semibold text-surface-200">{params.value ?? ""}</span>
          </div>
        );
      },
    },
    {
      field: "liquidity",
      headerName: "Depth",
      width: 90,
      valueFormatter: (p) => {
        if (p?.value == null) return "$0";
        if (p.value >= 1e9) return `$${(p.value / 1e9).toFixed(1)}B`;
        if (p.value >= 1e6) return `$${(p.value / 1e6).toFixed(0)}M`;
        return `$${Math.round(p.value / 1e3)}K`;
      },
      cellStyle: { color: "#22d3ee" },
    },
    {
      field: "spread",
      headerName: "Spread",
      width: 70,
      valueFormatter: (p) => p?.value != null ? `${Number(p.value).toFixed(2)}%` : "-",
      cellStyle: (p) => p?.value != null && p.value <= 0.03 ? { color: "#10b981" } : { color: "#f59e0b" },
    },
    {
      field: "gas",
      headerName: "Gas",
      width: 70,
      valueFormatter: (p) => {
        if (p?.value == null) return "-";
        return p.value < 1 ? `${p.value} gwei` : `${Number(p.value).toFixed(1)} gwei`;
      },
      cellStyle: (p) => p?.value != null && p.value < 1 ? { color: "#10b981" } : { color: "#ef4444" },
    },
    {
      field: "bridgeFee",
      headerName: "Bridge",
      width: 65,
      valueFormatter: (p) => p?.value != null ? `${Number(p.value).toFixed(2)}%` : "-",
    },
    {
      field: "slippage",
      headerName: "Slip",
      width: 55,
      valueFormatter: (p) => p?.value != null ? `${Number(p.value).toFixed(2)}%` : "-",
      cellStyle: (p) => p?.value != null && p.value <= 0.02 ? { color: "#10b981" } : { color: "#f59e0b" },
    },
    {
      field: "latency",
      headerName: "Lat",
      width: 50,
      valueFormatter: (p) => p?.value != null ? `${p.value}s` : "-",
      cellStyle: (p) => {
        if (p?.value == null) return {};
        if (p.value <= 5) return { color: "#10b981" };
        if (p.value <= 10) return { color: "#f59e0b" };
        return { color: "#ef4444" };
      },
    },
    {
      field: "privacy",
      headerName: "Priv",
      width: 55,
      valueFormatter: (p) => p?.value != null ? `${p.value}` : "-",
      cellStyle: (p) => p?.value != null && p.value >= 70 ? { color: "#22d3ee" } : { color: "#f59e0b" },
    },
    {
      field: "mev",
      headerName: "MEV",
      width: 55,
      valueFormatter: (p) => p?.value != null ? `${p.value}` : "-",
      cellStyle: (p) => p?.value != null && p.value >= 80 ? { color: "#10b981" } : { color: "#f59e0b" },
    },
    {
      field: "eta",
      headerName: "ETA",
      width: 55,
      valueFormatter: (p) => p?.value ?? "-",
    },
  ];

  const gridOptions: GridOptions = {
    suppressMovableColumns: true,
    suppressCellFocus: true,
    headerHeight: 24,
    rowHeight: 24,
    animateRows: false,
    enableCellTextSelection: true,
    ensureDomOrder: true,
    reactiveCustomComponents: true,
  };

  if (error) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">Market Matrix</span>
          <span className="panel-badge bg-matrix-red/10 text-matrix-red text-2xs">Error</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xs text-matrix-red font-mono mb-1">Grid initialization failed</div>
            <button onClick={() => setError(null)} className="btn text-2xs">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">Market Matrix</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-2xs text-surface-600 font-mono">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Market Matrix</span>
        <span className="panel-badge bg-matrix-green/10 text-matrix-green text-2xs">Live</span>
      </div>
      <div className="flex-1 ag-theme-ghost min-h-0">
        <AgGridReact
          ref={gridRef}
          rowData={CHAIN_DATA}
          columnDefs={colDefs}
          gridOptions={gridOptions}
          onGridReady={onGridReady}
          domLayout="normal"
        />
      </div>
    </div>
  );
}
