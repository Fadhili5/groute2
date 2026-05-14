"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ExecutionBlotter } from "@/components/execution-blotter/ExecutionBlotter";
import { RouteVisualizer } from "@/components/route-visualizer/RouteVisualizer";
import { AiSolver } from "@/components/ai-solver/AiSolver";

export default function ExecutionDeskPage() {
  return (
    <TerminalShell>
      <div className="grid grid-cols-12 gap-2 h-full">
        <div className="col-span-7 min-h-0">
          <ErrorBoundary name="Execution Blotter"><ExecutionBlotter /></ErrorBoundary>
        </div>
        <div className="col-span-5 min-h-0 flex flex-col gap-2">
          <div className="flex-1 min-h-0">
            <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>
          </div>
          <div className="flex-shrink-0 max-h-64">
            <ErrorBoundary name="AI Solver"><AiSolver /></ErrorBoundary>
          </div>
        </div>
      </div>
    </TerminalShell>
  );
}
