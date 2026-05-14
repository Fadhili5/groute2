"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { SolverMarketPanel } from "@/components/execution-blotter/SolverMarketPanel";

export default function SolverMarketplacePage() {
  return (
    <TerminalShell>
      <div className="h-full">
        <ErrorBoundary name="Solver Marketplace">
          <SolverMarketPanel />
        </ErrorBoundary>
      </div>
    </TerminalShell>
  );
}