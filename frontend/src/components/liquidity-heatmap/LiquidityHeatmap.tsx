"use client";

import { useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const DATA = [
  { chain: "ETH", depth: 842, util: 72, volume: 456, color: "#22d3ee" },
  { chain: "ARB", depth: 456, util: 65, volume: 312, color: "#10b981" },
  { chain: "BASE", depth: 234, util: 58, volume: 189, color: "#8b5cf6" },
  { chain: "SOL", depth: 678, util: 81, volume: 534, color: "#f59e0b" },
  { chain: "AVAX", depth: 189, util: 45, volume: 123, color: "#ef4444" },
  { chain: "BNB", depth: 312, util: 55, volume: 245, color: "#f97316" },
];

const GRID_DATA = [
  { chain: "ETH", pools: [
    { token: "USDC", depth: 320, apy: 4.2 },
    { token: "USDT", depth: 280, apy: 3.8 },
    { token: "ETH", depth: 420, apy: 2.1 },
    { token: "BTC", depth: 150, apy: 1.5 },
  ]},
  { chain: "ARB", pools: [
    { token: "USDC", depth: 220, apy: 5.8 },
    { token: "USDT", depth: 180, apy: 5.2 },
    { token: "ETH", depth: 310, apy: 3.4 },
    { token: "SOL", depth: 90, apy: 6.1 },
  ]},
  { chain: "SOL", pools: [
    { token: "USDC", depth: 410, apy: 6.9 },
    { token: "SOL", depth: 380, apy: 5.4 },
    { token: "BTC", depth: 120, apy: 2.8 },
    { token: "ETH", depth: 95, apy: 3.2 },
  ]},
];

export function LiquidityHeatmap() {
  const [view, setView] = useState<"chart" | "grid">("chart");

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Liquidity Intelligence</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("chart")}
            className={cn("text-2xs px-1.5 py-0.5 rounded-sm", view === "chart" ? "bg-surface-800 text-surface-300" : "text-surface-600")}
          >Depth</button>
          <button
            onClick={() => setView("grid")}
            className={cn("text-2xs px-1.5 py-0.5 rounded-sm", view === "grid" ? "bg-surface-800 text-surface-300" : "text-surface-600")}
          >Pools</button>
        </div>
      </div>

      <div className="flex-1 p-2">
        {view === "chart" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DATA} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="chain" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #1e293b',
                  borderRadius: '2px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                }}
                formatter={(value: number, name: string) => [
                  name === 'depth' ? `$${value}M` : `${value}%`,
                  name === 'depth' ? 'Depth' : 'Utilization',
                ]}
              />
              <Bar dataKey="depth" radius={[0, 2, 2, 0]} maxBarSize={12}>
                {DATA.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="space-y-2">
            {GRID_DATA.map((chain) => (
              <div key={chain.chain}>
                <div className="text-2xs font-semibold text-surface-400 mb-0.5 px-1">{chain.chain}</div>
                <div className="grid grid-cols-4 gap-1">
                  {chain.pools.map((pool) => (
                    <div
                      key={pool.token}
                      className="px-1.5 py-1 rounded-sm bg-matrix-bg border border-surface-800 text-center"
                    >
                      <div className="text-2xs font-mono text-surface-300">{pool.token}</div>
                      <div className="text-2xs font-mono text-matrix-accent">${pool.depth}M</div>
                      <div className="text-2xs font-mono text-matrix-green">{pool.apy}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-3 py-1.5 border-t border-matrix-border flex items-center justify-between">
        <span className="text-2xs text-surface-500">Cross-chain depth</span>
        <span className="text-2xs font-mono text-matrix-accent">$2.71B total</span>
      </div>
    </div>
  );
}
