"use client";

import { useState, useEffect } from "react";
import { cn, formatTimestamp } from "@/lib/utils";
import { useAlertStore } from "@/stores";
import { api } from "@/lib/api-client";
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  Waves,
  Server,
  Fuel,
  X,
  Loader2,
} from "lucide-react";
import type { Alert } from "@/types";

const ALERT_TYPES = {
  bridge_outage: { icon: Server, label: "Bridge Outage", color: "text-matrix-red" },
  route_success: { icon: CheckCircle2, label: "Route Success", color: "text-matrix-green" },
  mev_event: { icon: Shield, label: "MEV Event", color: "text-matrix-accent" },
  liquidity_spike: { icon: Waves, label: "Liquidity Spike", color: "text-matrix-purple" },
  relayer_failure: { icon: AlertTriangle, label: "Relayer Failure", color: "text-matrix-red" },
  gas_spike: { icon: Fuel, label: "Gas Spike", color: "text-matrix-yellow" },
};

export function AlertsFeed() {
  const [mounted, setMounted] = useState(false);
  const { alerts, addAlert, markAlertRead, setAlerts, setLoading, loading } = useAlertStore();
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (alerts.length === 0) {
      setLoading(true);
      api.getAlerts()
        .then((res) => {
          if (res.alerts?.length) setAlerts(res.alerts);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [alerts.length, setAlerts, setLoading]);

  const filtered = filter ? alerts.filter((a) => a.type === filter) : alerts;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Alerts Feed</span>
        <div className="flex items-center gap-1">
          {alerts.filter((a) => !a.read).length > 0 && (
            <span className="text-2xs font-mono text-matrix-yellow bg-matrix-yellow/10 px-1.5 py-0.5 rounded-sm">
              {alerts.filter((a) => !a.read).length} new
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-2 py-1 border-b border-matrix-border flex items-center gap-1 overflow-x-auto hide-scrollbar">
        {Object.entries(ALERT_TYPES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? null : key)}
            className={cn(
              "text-2xs px-1.5 py-0.5 rounded-sm whitespace-nowrap",
              filter === key ? "bg-surface-800 text-surface-300" : "text-surface-600 hover:text-surface-400"
            )}
          >
            {val.label}
          </button>
        ))}
        {filter && (
          <button onClick={() => setFilter(null)} className="text-2xs text-surface-600 hover:text-surface-400 ml-1">
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-2xs text-surface-600">No alerts</span>
          </div>
        ) : (
          filtered.map((alert) => {
            const def = ALERT_TYPES[alert.type];
            const Icon = def.icon;
            return (
              <div
                key={alert.id}
                onClick={() => markAlertRead(alert.id)}
                className={cn(
                  "flex items-start gap-2 px-3 py-1.5 border-b border-surface-900/50 cursor-pointer transition-colors",
                  alert.read ? "opacity-60" : "bg-surface-900/20",
                  "hover:bg-surface-800/30"
                )}
              >
                <Icon className={cn("w-3 h-3 mt-0.5 flex-shrink-0", def.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-2xs font-semibold", def.color)}>{def.label}</span>
                    {alert.chain && (
                      <span className="text-2xs font-mono text-surface-600 uppercase">{alert.chain}</span>
                    )}
                  </div>
                  <p className="text-2xs text-surface-400 truncate">{alert.message}</p>
                </div>
                <span className="text-2xs text-surface-600 font-mono flex-shrink-0">
                  {mounted ? formatTimestamp(alert.timestamp) : "00:00:00"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
