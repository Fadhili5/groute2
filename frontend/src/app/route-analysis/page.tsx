"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { RouteVisualizer } from "@/components/route-visualizer/RouteVisualizer";
import { AiSolver } from "@/components/ai-solver/AiSolver";

export default function RouteAnalysisPage() {
  return (
    <TerminalShell>
      <div className="grid grid-cols-12 gap-2 h-full">
        <div className="col-span-7 min-h-0">
          <ErrorBoundary name="Route Visualizer"><RouteVisualizer /></ErrorBoundary>
        </div>
        <div className="col-span-5 min-h-0">
          <ErrorBoundary name="AI Solver"><AiSolver /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
