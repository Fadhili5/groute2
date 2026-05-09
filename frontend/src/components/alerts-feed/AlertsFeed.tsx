"use client";

import { useState, useEffect } from "react";
import { cn, formatTimestamp } from "@/lib/utils";
import { useAlertStore } from "@/stores";
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  Waves,
  Server,
  Fuel,
  X,
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

function createInitialAlerts(): Alert[] {
  const now = Date.now();
  return [
    { id: "a1", type: "route_success", severity: "info", message: "Route 0x7f3c: 50,000 USDC ARB → ETH completed in 12.4s", timestamp: now - 5000, read: false },
    { id: "a2", type: "mev_event", severity: "warning", message: "MEV bot detected on Ethereum mempool - protection engaged", timestamp: now - 15000, read: false, chain: "ethereum" },
    { id: "a3", type: "bridge_outage", severity: "critical", message: "Wormhole: 4 relayers delayed on Avalanche path", timestamp: now - 30000, read: false, chain: "avalanche" },
    { id: "a4", type: "gas_spike", severity: "warning", message: "Base gas spike: 3.2 gwei (+240% in 5 min)", timestamp: now - 60000, read: false, chain: "base" },
    { id: "a5", type: "liquidity_spike", severity: "info", message: "Uniswap V3 ETH/USDC pool: +$42M depth added", timestamp: now - 120000, read: true, chain: "ethereum" },
    { id: "a6", type: "route_success", severity: "info", message: "Route 0x9a1b: 100,000 USDT BASE → SOL completed", timestamp: now - 180000, read: true },
    { id: "a7", type: "relayer_failure", severity: "warning", message: "Relayer node 0x8f3c missed 3 consecutive attestations", timestamp: now - 240000, read: true },
  ];
}

export function AlertsFeed() {
  const [mounted, setMounted] = useState(false);
  const { alerts, addAlert, markAlertRead } = useAlertStore();
  const [items, setItems] = useState<Alert[]>(() => createInitialAlerts());
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const types: Alert["type"][] = ["route_success", "mev_event", "gas_spike"];
      const type = types[Math.floor(Math.random() * types.length)];
      const newAlert: Alert = {
        id: `a${Date.now()}`,
        type,
        severity: type === "route_success" ? "info" : "warning",
        message: type === "route_success"
          ? `Route 0x${Math.random().toString(16).slice(2, 6)}: order completed`
          : type === "mev_event"
          ? "MEV activity detected on mempool"
          : "Gas price fluctuation detected",
        timestamp: Date.now(),
        read: false,
      };
      addAlert(newAlert);
      setItems((prev) => [newAlert, ...prev].slice(0, 50));
    }, 8000);

    return () => clearInterval(interval);
  }, [addAlert]);

  const filtered = filter ? items.filter((a) => a.type === filter) : items;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Alerts Feed</span>
        <div className="flex items-center gap-1">
          {items.filter((a) => !a.read).length > 0 && (
            <span className="text-2xs font-mono text-matrix-yellow bg-matrix-yellow/10 px-1.5 py-0.5 rounded-sm">
              {items.filter((a) => !a.read).length} new
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
        {filtered.map((alert) => {
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
        })}
      </div>
    </div>
  );
}
