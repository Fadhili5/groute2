"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridOptions, GridReadyEvent, RowClickedEvent } from "ag-grid-community";
import { cn } from "@/lib/utils";
import type { Chain } from "@/types";

export function MarketMatrix() {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<Chain[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/market/chains");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRowData(json.chains ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    try {
      params.api.sizeColumnsToFit();
    } catch {
      setError("Failed to initialize grid");
    }
  }, []);

  const onRowClicked = useCallback((event: RowClickedEvent) => {
    const chain = event.data as Chain;
    if (chain?.id) {
      window.dispatchEvent(new CustomEvent("chain-select", { detail: chain }));
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
        if (p?.value == null) return { color: "#64748b" };
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
    suppressContextMenu: true,
    headerHeight: 24,
    rowHeight: 24,
    animateRows: false,
    enableCellTextSelection: true,
    ensureDomOrder: true,
    reactiveCustomComponents: true,
  };

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

  if (error) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">Market Matrix</span>
          <span className="panel-badge bg-matrix-red/10 text-matrix-red text-2xs">Error</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xs text-matrix-red font-mono mb-1">{error}</div>
            <button onClick={fetchData} className="btn text-2xs">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Market Matrix</span>
        <div className="flex items-center gap-1">
          {loading && <span className="text-2xs text-surface-600 font-mono">Loading...</span>}
          {!loading && <span className="panel-badge bg-matrix-green/10 text-matrix-green text-2xs">{rowData.length} chains</span>}
          <button onClick={fetchData} className="text-surface-600 hover:text-surface-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v6h-6"/></svg>
          </button>
        </div>
      </div>
      <div className="flex-1 ag-theme-ghost min-h-0">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          gridOptions={gridOptions}
          onGridReady={onGridReady}
          onRowClicked={onRowClicked}
          domLayout="normal"
        />
      </div>
    </div>
  );
}
