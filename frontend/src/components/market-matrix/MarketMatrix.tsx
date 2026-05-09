"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridOptions, GridReadyEvent, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import { cn } from "@/lib/utils";

interface ChainRow {
  id: string;
  chain: string;
  shortName: string;
  liquidity: number;
  spread: number;
  gas: number;
  bridgeFee: number;
  slippage: number;
  mev: number;
  privacy: number;
  eta: string;
  status: "healthy" | "degraded" | "down";
}

const ROWS: ChainRow[] = [
  { id: "ethereum", chain: "Ethereum", shortName: "ETH", liquidity: 842_000_000, spread: 0.02, gas: 12.4, bridgeFee: 0.05, slippage: 0.01, mev: 92, privacy: 85, eta: "12s", status: "healthy" },
  { id: "arbitrum", chain: "Arbitrum", shortName: "ARB", liquidity: 456_000_000, spread: 0.03, gas: 0.08, bridgeFee: 0.03, slippage: 0.02, mev: 85, privacy: 78, eta: "8s", status: "healthy" },
  { id: "base", chain: "Base", shortName: "BASE", liquidity: 234_000_000, spread: 0.04, gas: 0.06, bridgeFee: 0.04, slippage: 0.03, mev: 80, privacy: 72, eta: "6s", status: "healthy" },
  { id: "solana", chain: "Solana", shortName: "SOL", liquidity: 678_000_000, spread: 0.01, gas: 0.0002, bridgeFee: 0.02, slippage: 0.01, mev: 60, privacy: 45, eta: "4s", status: "healthy" },
  { id: "avalanche", chain: "Avalanche", shortName: "AVAX", liquidity: 189_000_000, spread: 0.05, gas: 0.15, bridgeFee: 0.06, slippage: 0.04, mev: 75, privacy: 70, eta: "10s", status: "degraded" },
  { id: "bnb", chain: "BNB Chain", shortName: "BNB", liquidity: 312_000_000, spread: 0.03, gas: 0.04, bridgeFee: 0.04, slippage: 0.02, mev: 65, privacy: 55, eta: "7s", status: "healthy" },
];

function MevBadge(params: ICellRendererParams) {
  const val = params.value as number;
  if (val == null) return null;
  const label = val >= 80 ? "LOW" : val >= 60 ? "MEDIUM" : "HIGH";
  const cls = val >= 80 ? "bg-matrix-green/15 text-matrix-green" : val >= 60 ? "bg-matrix-yellow/15 text-matrix-yellow" : "bg-matrix-red/15 text-matrix-red";
  return <span className={cn("text-2xs font-mono px-1.5 py-0.5 rounded-sm font-semibold", cls)}>{label}</span>;
}

function PrivacyBadge(params: ICellRendererParams) {
  const val = params.value as number;
  if (val == null) return null;
  const cls = val >= 80 ? "text-matrix-accent" : val >= 60 ? "text-matrix-green" : "text-matrix-yellow";
  return <span className={cn("text-2xs font-mono font-semibold", cls)}>{val}</span>;
}

function ChainRenderer(params: ICellRendererParams) {
  const data = params.data as ChainRow | undefined;
  if (!data) return null;
  const dotCls = data.status === "healthy" ? "bg-matrix-green" : data.status === "degraded" ? "bg-matrix-yellow" : "bg-matrix-red";
  return (
    <div className="flex items-center gap-2 h-full">
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotCls)} />
      <span className="font-semibold text-surface-200 text-xs">{data.shortName}</span>
    </div>
  );
}

function NumericCell(params: ICellRendererParams) {
  return <span className="font-mono text-surface-200 text-xs">{params.valueFormatted ?? params.value}</span>;
}

export function MarketMatrix() {
  const gridRef = useRef<AgGridReact>(null);
  const [mounted, setMounted] = useState(false);
  const [rowData, setRowData] = useState<ChainRow[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/market/chains");
        if (res.ok) {
          const json = await res.json();
          if (json.chains?.length) setRowData(json.chains);
          else setRowData(ROWS);
        } else setRowData(ROWS);
      } catch { setRowData(ROWS); }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    try { params.api.sizeColumnsToFit(); } catch { /* ignore */ }
  }, []);

  const colDefs = useMemo<ColDef[]>(() => [
    {
      field: "shortName",
      headerName: "Chain",
      width: 80,
      minWidth: 70,
      maxWidth: 100,
      cellRenderer: ChainRenderer,
      filter: "agTextColumnFilter",
      sortable: true,
    },
    {
      field: "liquidity",
      headerName: "Liquidity",
      width: 110,
      minWidth: 100,
      type: "numericColumn",
      cellRenderer: NumericCell,
      valueFormatter: (p: ValueFormatterParams) => {
        if (p.value == null) return "$0";
        if (p.value >= 1e9) return `$${(p.value / 1e9).toFixed(1)}B`;
        if (p.value >= 1e6) return `$${(p.value / 1e6).toFixed(1)}M`;
        return `$${(p.value / 1e3).toFixed(1)}K`;
      },
      cellStyle: { color: "#22d3ee" },
      filter: "agNumberColumnFilter",
      sortable: true,
    },
    {
      field: "spread",
      headerName: "Spread",
      width: 85,
      minWidth: 80,
      type: "numericColumn",
      cellRenderer: NumericCell,
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? `${Number(p.value).toFixed(2)}%` : "-",
      cellStyle: (p) => p.value != null && p.value <= 0.03 ? { color: "#10b981" } : { color: "#f59e0b" },
      filter: "agNumberColumnFilter",
      sortable: true,
    },
    {
      field: "gas",
      headerName: "Gas",
      width: 85,
      minWidth: 80,
      type: "numericColumn",
      cellRenderer: NumericCell,
      valueFormatter: (p: ValueFormatterParams) => {
        if (p.value == null) return "-";
        return p.value < 1 ? `$${(p.value * 100).toFixed(2)}` : `$${Number(p.value).toFixed(2)}`;
      },
      cellStyle: (p) => p.value != null && p.value < 1 ? { color: "#10b981" } : { color: "#ef4444" },
      filter: "agNumberColumnFilter",
      sortable: true,
    },
    {
      field: "bridgeFee",
      headerName: "Bridge Fee",
      width: 100,
      minWidth: 90,
      type: "numericColumn",
      cellRenderer: NumericCell,
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? `$${Number(p.value).toFixed(2)}` : "-",
      cellStyle: { color: "#94a3b8" },
      filter: "agNumberColumnFilter",
      sortable: true,
    },
    {
      field: "slippage",
      headerName: "Slippage",
      width: 95,
      minWidth: 85,
      type: "numericColumn",
      cellRenderer: NumericCell,
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? `${Number(p.value).toFixed(2)}%` : "-",
      cellStyle: (p) => p.value != null && p.value <= 0.02 ? { color: "#10b981" } : { color: "#f59e0b" },
      filter: "agNumberColumnFilter",
      sortable: true,
    },
    {
      field: "mev",
      headerName: "MEV Risk",
      width: 105,
      minWidth: 95,
      cellRenderer: MevBadge,
      sortable: true,
      filter: "agNumberColumnFilter",
    },
    {
      field: "privacy",
      headerName: "Privacy",
      width: 85,
      minWidth: 80,
      type: "numericColumn",
      cellRenderer: PrivacyBadge,
      sortable: true,
      filter: "agNumberColumnFilter",
    },
    {
      field: "eta",
      headerName: "ETA",
      width: 70,
      minWidth: 65,
      cellRenderer: NumericCell,
      sortable: true,
    },
  ], []);

  const gridOptions = useMemo<GridOptions>(() => ({
    suppressMovableColumns: true,
    suppressCellFocus: true,
    suppressContextMenu: true,
    headerHeight: 34,
    rowHeight: 36,
    animateRows: false,
    enableCellTextSelection: true,
    ensureDomOrder: true,
    reactiveCustomComponents: true,
    defaultColDef: {
      sortable: true,
      resizable: true,
      filter: true,
      floatingFilter: true,
      suppressHeaderMenuButton: true,
    },
  }), []);

  if (!mounted) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">Market Matrix</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-2xs text-surface-600 font-mono animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Market Matrix</span>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-surface-500 font-mono">{rowData.length} chains</span>
          <button onClick={() => gridRef.current?.api?.sizeColumnsToFit()} className="text-surface-600 hover:text-surface-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v6h-6"/></svg>
          </button>
        </div>
      </div>
      <div className="flex-1 ag-theme-ghost w-full" style={{ minHeight: 0 }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          gridOptions={gridOptions}
          onGridReady={onGridReady}
          domLayout="normal"
          enableCellTextSelection={true}
          rowSelection="single"
          getRowId={(p) => p.data.id}
        />
      </div>
    </div>
  );
}
