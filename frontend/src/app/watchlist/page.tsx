"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Watchlist } from "@/components/watchlist/Watchlist";
import { MarketMatrix } from "@/components/market-matrix/MarketMatrix";

export default function WatchlistPage() {
  return (
    <TerminalShell>
      <div className="grid grid-cols-12 gap-2 h-full">
        <div className="col-span-5 min-h-0">
          <ErrorBoundary name="Watchlist"><Watchlist /></ErrorBoundary>
        </div>
        <div className="col-span-7 min-h-0">
          <ErrorBoundary name="Market Matrix"><MarketMatrix /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
