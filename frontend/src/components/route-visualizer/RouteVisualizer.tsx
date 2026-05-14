"use client";

import { useState, useEffect } from "react";
import { useRouteStore } from "@/stores";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { ArrowRight, Wallet, Shuffle, GitBranch, Database, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { RouteFragment } from "@/types";

const FRAGMENT_ICONS: Record<string, any> = {
  wallet: Wallet,
  fragment: Shuffle,
  split: Shuffle,
  bridge: GitBranch,
  dex: ArrowRight,
  swap: ArrowRight,
  liquidity: Database,
  settlement: CheckCircle2,
  settle: CheckCircle2,
};

const FRAGMENT_COLORS: Record<string, string> = {
  wallet: "text-ghost-400 border-ghost-700/50",
  fragment: "text-matrix-yellow border-matrix-yellow/30",
  split: "text-matrix-yellow border-matrix-yellow/30",
  bridge: "text-matrix-accent border-matrix-accent/30",
  dex: "text-matrix-green border-matrix-green/30",
  swap: "text-matrix-green border-matrix-green/30",
  liquidity: "text-matrix-purple border-matrix-purple/30",
  settlement: "text-surface-400 border-surface-700",
  settle: "text-surface-400 border-surface-700",
};

export function RouteVisualizer() {
  const { activeRoute, setActiveRoute } = useRouteStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeRoute && !loading) {
      setLoading(true);
      api.simulateRoute()
        .then((data) => {
          if (data?.fragments) {
            setActiveRoute({
              id: data.id,
              fragments: data.fragments.map((f: any, i: number) => ({
                id: `f${i}`,
                type: f.type,
                label: f.label,
                cost: parseFloat(f.cost.replace("$", "")),
                latency: parseFloat(f.duration.replace("s", "")),
                privacyScore: 85 - i * 3,
                confidence: 99 - i * 1.5,
                expectedReturn: Math.random() * 0.03,
                status: (i === 0 || i === 1 ? "completed" : i === 2 ? "active" : "pending") as "completed" | "active" | "pending",
              })),
              totalCost: 0,
              totalLatency: 0,
              avgPrivacyScore: 0,
              avgConfidence: 0,
              totalReturn: 0,
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeRoute, loading, setActiveRoute]);

  const fragments = activeRoute?.fragments ?? [];

  const totalCost = fragments.reduce((s, f) => s + f.cost, 0);
  const totalLatency = fragments.reduce((s, f) => s + f.latency, 0);
  const avgPrivacy = fragments.length ? Math.round(fragments.reduce((s, f) => s + f.privacyScore, 0) / fragments.length) : 0;
  const avgConfidence = fragments.length ? Math.round(fragments.reduce((s, f) => s + f.confidence, 0) / fragments.length) : 0;
  const totalReturn = fragments.reduce((s, f) => s + f.expectedReturn, 0);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Route Visualizer</span>
        {fragments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono text-matrix-green">{totalCost.toFixed(2)}% fee</span>
            <span className="text-2xs font-mono text-surface-500">|</span>
            <span className="text-2xs font-mono text-matrix-accent">{totalLatency.toFixed(1)}s</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
          </div>
        ) : fragments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-2xs text-surface-600">No active route. Use Execution Blotter to create one.</span>
          </div>
        ) : (
          <>
            <div className="relative flex flex-col items-center py-4">
              {fragments.map((f, i) => {
                const Icon = FRAGMENT_ICONS[f.type] || ArrowRight;
                return (
                  <div key={f.id} className="flex items-center w-full gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center transition-colors",
                        FRAGMENT_COLORS[f.type],
                        f.status === "active" && "glow-accent",
                        f.status === "failed" && "border-matrix-red/30"
                      )}>
                        {f.status === "failed" ? (
                          <XCircle className="w-3.5 h-3.5 text-matrix-red" />
                        ) : (
                          <Icon className={cn(
                            "w-3.5 h-3.5",
                            f.status === "active" && "animate-pulse-slow"
                          )} />
                        )}
                      </div>
                      {i < fragments.length - 1 && (
                        <div className={cn(
                          "w-px h-6",
                          f.status === "completed" ? "bg-matrix-green/40" : "bg-surface-800"
                        )} />
                      )}
                    </div>
                    <div className={cn(
                      "flex-1 flex items-center justify-between px-3 py-1.5 rounded-sm border bg-matrix-bg/50",
                      f.status === "active" ? "border-matrix-accent/20" : "border-surface-800"
                    )}>
                      <div>
                        <span className={cn(
                          "text-xs font-medium",
                          f.status === "active" ? "text-surface-200" : "text-surface-400"
                        )}>{f.label}</span>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-2xs font-mono text-surface-500">{f.type}</span>
                          <span className={cn(
                            "text-2xs font-mono",
                            f.status === "active" ? "text-matrix-accent" : "text-surface-600",
                            f.status === "active" && "animate-pulse-slow"
                          )}>
                            {f.status === "active" ? "IN PROGRESS" : f.status === "completed" ? "DONE" : f.status === "failed" ? "FAILED" : "PENDING"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xs font-mono text-surface-500">{f.latency.toFixed(1)}s</div>
                        <div className="text-2xs font-mono text-matrix-green">${f.cost.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-surface-800">
              <MetricBox label="Total Cost" value={`${totalCost.toFixed(2)}%`} color="text-matrix-green" />
              <MetricBox label="Avg Privacy" value={`${avgPrivacy}/100`} color="text-matrix-accent" />
              <MetricBox label="Confidence" value={`${avgConfidence}%`} color="text-matrix-green" />
              <MetricBox label="Return" value={`+${totalReturn.toFixed(2)}%`} color={totalReturn >= 0 ? "text-matrix-green" : "text-matrix-red"} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-2xs text-surface-500 uppercase tracking-wider">{label}</div>
      <div className={cn("text-xs font-mono font-semibold mt-0.5", color)}>{value}</div>
    </div>
  );
}
