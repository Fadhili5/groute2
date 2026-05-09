"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { SettlementInspector } from "@/components/settlement-inspector/SettlementInspector";
import { ExecutionBlotter } from "@/components/execution-blotter/ExecutionBlotter";

export default function SettlementPage() {
  return (
    <TerminalShell>
      <div className="grid grid-cols-12 gap-2 h-full">
        <div className="col-span-6 min-h-0">
          <ErrorBoundary name="Settlement Inspector"><SettlementInspector /></ErrorBoundary>
        </div>
        <div className="col-span-6 min-h-0">
          <ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
