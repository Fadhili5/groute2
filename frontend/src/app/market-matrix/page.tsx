"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { MarketMatrix } from "@/components/market-matrix/MarketMatrix";
import { RouteVisualizer } from "@/components/route-visualizer/RouteVisualizer";
import { LiquidityHeatmap } from "@/components/liquidity-heatmap/LiquidityHeatmap";

function CollapsibleSection({
  title,
  height = 280,
  defaultOpen = true,
  children,
}: {
  title: string;
  height?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel flex-shrink-0">
      <div
        className="panel-header cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="panel-title">{title}</span>
        {open ? (
          <ChevronUp className="w-3 h-3 text-surface-500" />
        ) : (
          <ChevronDown className="w-3 h-3 text-surface-500" />
        )}
      </div>
      {open && <div style={{ height }}>{children}</div>}
    </div>
  );
}

export default function MarketMatrixPage() {
  return (
    <TerminalShell>
      <div className="flex flex-col gap-2 h-full overflow-y-auto pb-2">
        {/* Top row — fixed height, side by side */}
        <div className="flex gap-2 flex-shrink-0" style={{ height: 440 }}>
          <div className="flex-[7] min-w-0 h-full">
            <ErrorBoundary name="Market Matrix">
              <MarketMatrix />
            </ErrorBoundary>
          </div>
          <div className="flex-[5] min-w-0 h-full">
            <ErrorBoundary name="Route Visualizer">
              <RouteVisualizer />
            </ErrorBoundary>
          </div>
        </div>

        {/* Bottom — collapsible */}
        <CollapsibleSection title="Liquidity Heatmap" height={280} defaultOpen>
          <ErrorBoundary name="Liquidity Heatmap">
            <LiquidityHeatmap />
          </ErrorBoundary>
        </CollapsibleSection>
      </div>
    </TerminalShell>
  );
}
