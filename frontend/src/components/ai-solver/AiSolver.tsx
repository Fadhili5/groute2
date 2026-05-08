"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronRight, AlertTriangle, Shield, Zap } from "lucide-react";

const RECOMMENDATION = {
  path: "ETH → LayerZero → Arbitrum → Uniswap V3 → USDC",
  reason: "Optimal gas + liquidity combination. LayerZero shows 99.8% uptime with 2.1s finality. Arbitrum DEX pools have $456M depth with minimal slippage.",
  alternatives: [
    "ETH → Across → Base → Aerodrome → USDC (3.2s, $0.08 gas)",
    "ETH → CCTP → Avalanche → Trader Joe → USDC (4.1s, $0.15 gas)",
  ],
  confidence: 94,
  bridgeHealth: "99.8% uptime",
  mevForecast: "Low risk - Flashbots + privacy RPC",
};

export function AiSolver() {
  const [rec] = useState(RECOMMENDATION);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">AI Solver</span>
        <Sparkles className="w-3 h-3 text-matrix-yellow" />
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        <div className="panel-header !px-2 !py-1.5 !bg-matrix-bg !border-surface-800 rounded-sm">
          <span className="text-2xs text-surface-500 uppercase tracking-wider">Recommended Path</span>
          <span className={cn(
            "text-2xs font-mono font-semibold px-1.5 py-0.5 rounded-sm",
            rec.confidence >= 90 ? "bg-matrix-green/10 text-matrix-green" : "bg-matrix-yellow/10 text-matrix-yellow"
          )}>
            {rec.confidence}% confidence
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {rec.path.split(" → ").map((step, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-2xs font-mono text-surface-300 bg-matrix-bg px-1.5 py-0.5 rounded-sm border border-surface-800">
                {step}
              </span>
              {i < rec.path.split(" → ").length - 1 && (
                <ChevronRight className="w-2.5 h-2.5 text-surface-600" />
              )}
            </span>
          ))}
        </div>

        <div className="space-y-1">
          <span className="text-2xs text-surface-500 uppercase tracking-wider">Why this route</span>
          <p className="text-2xs text-surface-400 leading-relaxed">{rec.reason}</p>
        </div>

        <div className="space-y-1.5">
          <span className="text-2xs text-surface-500 uppercase tracking-wider">Alternatives</span>
          {rec.alternatives.map((alt, i) => (
            <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-sm bg-matrix-bg border border-surface-800">
              <span className="text-2xs text-surface-600 font-mono mt-0.5">#{i + 1}</span>
              <span className="text-2xs text-surface-400">{alt}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-800">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-matrix-green" />
            <div>
              <div className="text-2xs text-surface-500">Bridge</div>
              <div className="text-2xs font-mono text-matrix-green">{rec.bridgeHealth}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-matrix-accent" />
            <div>
              <div className="text-2xs text-surface-500">MEV Risk</div>
              <div className="text-2xs font-mono text-matrix-accent">Low</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-matrix-yellow" />
            <div>
              <div className="text-2xs text-surface-500">Slippage</div>
              <div className="text-2xs font-mono text-matrix-yellow">0.02%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
