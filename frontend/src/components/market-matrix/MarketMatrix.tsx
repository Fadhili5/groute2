"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridOptions, GridReadyEvent, ICellRendererParams, RowClickedEvent } from "ag-grid-community";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import type { Chain } from "@/types";

function ChainRenderer({ data }: ICellRendererParams<Chain>) {
  if (!data) return null;
  const dot = data.status === "healthy" ? "bg-matrix-green" : data.status === "degraded" ? "bg-matrix-yellow" : "bg-matrix-red";
  return (
    <div className="flex items-center gap-2 h-full">
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
      <span className="text-xs font-medium text-surface-200">{data.shortName}</span>
    </div>
  );
}

function MevBadge({ value }: ICellRendererParams<Chain>) {
  if (value == null) return null;
  const label = value >= 80 ? "LOW" : value >= 60 ? "MED" : "HIGH";
  const cls = value >= 80 ? "text-matrix-green" : value >= 60 ? "text-matrix-yellow" : "text-matrix-red";
  return <span className={cn("text-xs font-mono", cls)}>{label}</span>;
}

function PrivacyBadge({ value }: ICellRendererParams<Chain>) {
  if (value == null) return null;
  const cls = value >= 80 ? "text-matrix-accent" : value >= 60 ? "text-matrix-green" : "text-matrix-yellow";
  return <span className={cn("text-xs font-mono", cls)}>{value}</span>;
}

function LiquidityCell({ value }: ICellRendererParams<Chain>) {
  if (value == null) return <span className="text-xs font-mono text-surface-500">—</span>;
  const formatted = value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : `$${(value / 1e3).toFixed(0)}K`;
  return <span className="text-xs font-mono text-surface-300">{formatted}</span>;
}

function MetricCell({ value, format }: ICellRendererParams<Chain> & { format?: string }) {
  if (value == null) return <span className="text-xs font-mono text-surface-500">—</span>;
  if (!format) return <span className="text-xs font-mono text-surface-300">{String(value)}</span>;
  return <span className="text-xs font-mono text-surface-300">{format.replace("{v}", String(value))}</span>;
}

function SpreadCell({ value }: ICellRendererParams<Chain>) {
  if (value == null) return <span className="text-xs font-mono text-surface-500">—</span>;
  const color = value <= 0.03 ? "text-matrix-green" : value <= 0.04 ? "text-matrix-yellow" : "text-matrix-red";
  return <span className={cn("text-xs font-mono", color)}>{Number(value).toFixed(2)}%</span>;
}

function GasCell({ value }: ICellRendererParams<Chain>) {
  if (value == null) return <span className="text-xs font-mono text-surface-500">—</span>;
  const color = value < 1 ? "text-matrix-green" : value < 5 ? "text-matrix-yellow" : "text-matrix-red";
  const formatted = value < 1 ? `$${(value * 100).toFixed(0)}` : `$${Number(value).toFixed(2)}`;
  return <span className={cn("text-xs font-mono", color)}>{formatted}</span>;
}

function SlipCell({ value }: ICellRendererParams<Chain>) {
  if (value == null) return <span className="text-xs font-mono text-surface-500">—</span>;
  const color = value <= 0.02 ? "text-matrix-green" : value <= 0.03 ? "text-matrix-yellow" : "text-matrix-red";
  return <span className={cn("text-xs font-mono", color)}>{Number(value).toFixed(2)}%</span>;
}

function StatusCell({ value }: ICellRendererParams<Chain>) {
  if (!value) return null;
  const color = value === "healthy" ? "bg-matrix-green" : value === "degraded" ? "bg-matrix-yellow" : "bg-matrix-red";
  return <span className={cn("w-2 h-2 rounded-full inline-block", color)} />;
}

const CHAIN_DATA: Chain[] = [
  { id: "ethereum", name: "Ethereum", shortName: "ETH", liquidity: 842_000_000, spread: 0.02, gas: 12.4, bridgeFee: 0.05, slippage: 0.01, latency: 12, privacy: 85, mev: 92, eta: "12s", status: "healthy" },
  { id: "arbitrum", name: "Arbitrum", shortName: "ARB", liquidity: 456_000_000, spread: 0.03, gas: 0.08, bridgeFee: 0.03, slippage: 0.02, latency: 3, privacy: 78, mev: 85, eta: "8s", status: "healthy" },
  { id: "base", name: "Base", shortName: "BASE", liquidity: 234_000_000, spread: 0.04, gas: 0.06, bridgeFee: 0.04, slippage: 0.03, latency: 2, privacy: 72, mev: 80, eta: "6s", status: "healthy" },
  { id: "solana", name: "Solana", shortName: "SOL", liquidity: 678_000_000, spread: 0.01, gas: 0.0002, bridgeFee: 0.02, slippage: 0.01, latency: 1, privacy: 45, mev: 60, eta: "4s", status: "healthy" },
  { id: "avalanche", name: "Avalanche", shortName: "AVAX", liquidity: 189_000_000, spread: 0.05, gas: 0.15, bridgeFee: 0.06, slippage: 0.04, latency: 5, privacy: 70, mev: 75, eta: "10s", status: "degraded" },
  { id: "bnb", name: "BNB Chain", shortName: "BNB", liquidity: 312_000_000, spread: 0.03, gas: 0.04, bridgeFee: 0.04, slippage: 0.02, latency: 4, privacy: 55, mev: 65, eta: "7s", status: "healthy" },
];

const COL_DEFS: ColDef<Chain>[] = [
  {
    field: "shortName",
    headerName: "Chain",
    width: 60,
    minWidth: 50,
    cellRenderer: ChainRenderer,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "liquidity",
    headerName: "Liquidity",
    width: 100,
    minWidth: 80,
    cellRenderer: LiquidityCell,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "spread",
    headerName: "Spread",
    width: 60,
    minWidth: 50,
    cellRenderer: SpreadCell,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "gas",
    headerName: "Gas",
    width: 55,
    minWidth: 45,
    cellRenderer: GasCell,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "bridgeFee",
    headerName: "Bridge",
    width: 55,
    minWidth: 45,
    cellRenderer: MetricCell,
    cellRendererParams: { format: "{v}bp" },
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "slippage",
    headerName: "Slip",
    width: 50,
    minWidth: 40,
    cellRenderer: SlipCell,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "latency",
    headerName: "Lat",
    width: 45,
    minWidth: 40,
    cellRenderer: MetricCell,
    cellRendererParams: { format: "{v}s" },
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "privacy",
    headerName: "Privacy",
    width: 50,
    minWidth: 40,
    cellRenderer: PrivacyBadge,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "mev",
    headerName: "MEV",
    width: 50,
    minWidth: 40,
    cellRenderer: MevBadge,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "eta",
    headerName: "ETA",
    width: 40,
    minWidth: 35,
    cellRenderer: MetricCell,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
  {
    field: "status",
    headerName: "Status",
    width: 40,
    minWidth: 35,
    cellRenderer: StatusCell,
    sortable: true,
    resizable: true,
    suppressMovable: true,
  },
];

const GRID_OPTS: GridOptions<Chain> = {
  headerHeight: 30,
  rowHeight: 32,
  suppressCellFocus: true,
  suppressContextMenu: true,
  animateRows: false,
  enableCellTextSelection: true,
  ensureDomOrder: true,
};

export function MarketMatrix() {
  const gridRef = useRef<AgGridReact>(null);
  const [mounted, setMounted] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COL_DEFS.map((c) => c.field!)
  );

  const [rowData, setRowData] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const json = await api.getChains();
        setRowData(json.chains?.length ? json.chains : CHAIN_DATA);
      } catch { setRowData(CHAIN_DATA); }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

const visibleColumnDefs = COL_DEFS.filter((colDef): colDef is ColDef<Chain> => 
  visibleColumns.includes(colDef.field!)
);

  const onGridReady = useCallback((e: GridReadyEvent) => {
    e.api.sizeColumnsToFit();
  }, []);

  const onRowClicked = useCallback((e: RowClickedEvent<Chain>) => {
    setSelectedChain((prev) => (prev?.id === e.data?.id ? null : e.data ?? null));
  }, []);

  if (!mounted) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Market Matrix</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[11px] text-surface-600 font-mono animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

return (
  <div className="panel h-full flex flex-col overflow-hidden">
    <div className="panel-header flex-shrink-0">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="panel-title">Market Matrix</span>
          <span className="text-[10px] text-surface-500 font-mono">{rowData.length} chains</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => gridRef.current?.api?.sizeColumnsToFit()}
            className="text-surface-600 hover:text-surface-300 transition-colors p-0.5 rounded"
            title="Resize columns"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v6h-6"/>
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColumnMenu(!showColumnMenu);
              }}
              className="text-surface-500 hover:text-surface-300 transition-colors p-1 rounded hover:bg-surface-800/20"
              title="Show/hide columns"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-900 border border-surface-800 rounded-sm shadow-lg z-10">
                <div className="px-3 py-2 text-xs font-medium text-surface-400 border-b border-surface-800">Columns</div>
                <div className="space-y-1 px-3 py-2">
                  {COL_DEFS.map((colDef) => (
                    <div
                      key={colDef.field}
                      className="flex items-center gap-2"
                    >
<input
  type="checkbox"
  checked={visibleColumns.includes(colDef.field!)}
  onChange={(e) => {
    e.stopPropagation();
    const field = colDef.field;
    if (!field) return;
    if (visibleColumns.includes(field)) {
      setVisibleColumns(visibleColumns.filter(f => f !== field));
    } else {
      setVisibleColumns([...visibleColumns, field]);
    }
  }}
  className="w-4 h-4 text-surface-400"
/>
                      <span className="text-xs font-medium text-surface-300">{colDef.headerName}</span>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 text-center">
                  <button
onClick={() => {
                       // Get all field values that are strings
                       const allFields: string[] = [];
                       COL_DEFS.forEach(def => {
                         if (typeof def.field === 'string') {
                           allFields.push(def.field);
                         }
                       });
                       setVisibleColumns(allFields);
                     }}
                    className="w-full text-xs font-medium text-surface-500 hover:text-surface-200"
                  >
                    Show All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    <div className="flex-1 ag-theme-ghost overflow-hidden" style={{ minHeight: 0 }}>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={visibleColumnDefs}
        gridOptions={GRID_OPTS}
        onGridReady={onGridReady}
        onRowClicked={onRowClicked}
        domLayout="normal"
        rowSelection="single"
        getRowId={(p) => p.data.id}
      />
    </div>

    {selectedChain && (
      <div className="flex-shrink-0 border-t border-matrix-border bg-surface-950 px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              selectedChain.status === "healthy" ? "bg-matrix-green" : selectedChain.status === "degraded" ? "bg-matrix-yellow" : "bg-matrix-red"
            )} />
            <span className="text-xs font-semibold text-surface-200">{selectedChain.name}</span>
            <span className="text-2xs font-mono text-surface-500">{selectedChain.shortName}</span>
          </div>
          <button onClick={() => setSelectedChain(null)} className="text-surface-600 hover:text-surface-400 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-x-4 gap-y-1.5">
          {[
            { label: "Liquidity", value: selectedChain.liquidity >= 1e9 ? `$${(selectedChain.liquidity / 1e9).toFixed(1)}B` : `$${(selectedChain.liquidity / 1e6).toFixed(0)}M` },
            { label: "Spread", value: `${Number(selectedChain.spread).toFixed(2)}%` },
            { label: "Gas", value: selectedChain.gas < 1 ? `$${(selectedChain.gas * 100).toFixed(0)}¢` : `$${Number(selectedChain.gas).toFixed(2)}` },
            { label: "Bridge Fee", value: `${selectedChain.bridgeFee}bp` },
            { label: "Slippage", value: `${Number(selectedChain.slippage).toFixed(2)}%` },
            { label: "Latency", value: `${selectedChain.latency}s` },
            { label: "Privacy", value: `${selectedChain.privacy}/100` },
            { label: "MEV", value: selectedChain.mev >= 80 ? "LOW" : selectedChain.mev >= 60 ? "MED" : "HIGH" },
            { label: "ETA", value: selectedChain.eta },
            { label: "Status", value: selectedChain.status },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-2xs text-surface-600 uppercase tracking-wider">{label}</div>
              <div className="text-2xs font-mono text-surface-300 mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
}
