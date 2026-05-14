"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
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

const CHAIN_COLORS: Record<string, string> = {
  ETH: "#22d3ee",
  ARB: "#10b981",
  BASE: "#8b5cf6",
  SOL: "#f59e0b",
  AVAX: "#ef4444",
  BNB: "#f97316",
};

export function LiquidityHeatmap() {
  const [view, setView] = useState<"chart" | "grid">("chart");
  const [data, setData] = useState<any[]>([]);
  const [poolData, setPoolData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDepth, setTotalDepth] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const chainsRes = await api.getChains();
        if (chainsRes.chains?.length) {
          const chartData = chainsRes.chains.map((c: any) => ({
            chain: c.shortName,
            depth: Math.round(c.liquidity / 1_000_000),
            util: 50 + Math.floor(Math.random() * 30),
            volume: Math.round((c.liquidity / 1_000_000) * 0.5),
            color: CHAIN_COLORS[c.shortName] || "#64748b",
          }));
          setData(chartData);
          setTotalDepth(chartData.reduce((s: number, d: any) => s + d.depth, 0));
        }
      } catch { /* use empty */ }
      try {
        const liqRes = await api.getLiquidity();
        if (liqRes.pools?.length) {
          setPoolData(liqRes.pools);
        }
      } catch { /* use empty */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">Liquidity Heatmap</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
        </div>
      </div>
    );
  }

  const chainPools = poolData.reduce((acc: any, p: any) => {
    if (!acc[p.chain]) acc[p.chain] = [];
    acc[p.chain].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Liquidity Heatmap</span>
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
        {view === "chart" && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
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
                formatter={(value: number) => [`$${value}M`, 'Depth']}
              />
              <Bar dataKey="depth" radius={[0, 2, 2, 0]} maxBarSize={12}>
                {data.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : view === "grid" && Object.keys(chainPools).length > 0 ? (
          <div className="space-y-2 overflow-y-auto h-full">
            {Object.entries(chainPools).map(([chain, pools]: [string, any]) => (
              <div key={chain}>
                <div className="text-2xs font-semibold text-surface-400 mb-0.5 px-1">{chain}</div>
                <div className="grid grid-cols-4 gap-1">
                  {(pools as any[]).slice(0, 4).map((pool: any) => (
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
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-2xs text-surface-600">No liquidity data available</span>
          </div>
        )}
      </div>

      {totalDepth > 0 && (
        <div className="flex-shrink-0 px-3 py-1.5 border-t border-matrix-border flex items-center justify-between">
          <span className="text-2xs text-surface-500">Cross-chain depth</span>
          <span className="text-2xs font-mono text-matrix-accent">${totalDepth}M total</span>
        </div>
      )}
    </div>
  );
}
