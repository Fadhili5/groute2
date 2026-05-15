"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn, formatTimestamp } from "@/lib/utils";
import { useSolverStore } from "@/stores";

export function RecentExecutions() {
  const { orders, setOrders } = useSolverStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getOrders();
        if (mounted) setOrders(res);
      } catch {
        // Keep previous rows if request fails.
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 8000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [setOrders]);

  const rows = useMemo(() => {
    return [...orders].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  }, [orders]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Recent Executions</span>
        <span className="text-2xs text-surface-600 font-mono">{rows.length}</span>
      </div>

      <div className="flex-shrink-0 px-3 py-1 border-b border-matrix-border grid grid-cols-12 gap-2 text-2xs text-surface-600 uppercase tracking-wider">
        <span className="col-span-3">Route ID</span>
        <span className="col-span-2">Asset</span>
        <span className="col-span-2 text-right">Amount</span>
        <span className="col-span-2">Route</span>
        <span className="col-span-2">Time</span>
        <span className="col-span-1 text-right">Status</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && rows.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-2xs text-surface-600">
            No execution history
          </div>
        ) : (
          rows.map((order) => {
            const ok = order.status === "completed";
            const failed = order.status === "failed";
            const statusCls = ok
              ? "text-matrix-green"
              : failed
                ? "text-matrix-red"
                : "text-matrix-yellow";

            return (
              <div
                key={order.id}
                className="px-3 py-1.5 border-b border-surface-900/50 grid grid-cols-12 gap-2 text-2xs hover:bg-surface-800/20"
              >
                <span className="col-span-3 font-mono text-surface-400 truncate">{order.id.slice(0, 10)}</span>
                <span className="col-span-2 text-surface-300 uppercase">{order.sourceAsset}</span>
                <span className="col-span-2 text-right font-mono text-surface-300">{Number(order.amount || 0).toLocaleString()}</span>
                <span className="col-span-2 text-surface-500 truncate">{order.sourceChain}→{order.destinationChain}</span>
                <span className="col-span-2 font-mono text-surface-600">{formatTimestamp(order.timestamp)}</span>
                <span className={cn("col-span-1 flex items-center justify-end gap-1", statusCls)}>
                  {ok && <CheckCircle2 className="w-3 h-3" />}
                  {failed && <XCircle className="w-3 h-3" />}
                  {!ok && !failed && <Clock3 className="w-3 h-3" />}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
