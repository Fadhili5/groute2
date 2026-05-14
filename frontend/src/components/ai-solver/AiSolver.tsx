"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronRight, AlertTriangle, Shield, Zap, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

export function AiSolver() {
  const [path, setPath] = useState("ETH → LayerZero → Arbitrum → Uniswap V3 → USDC");
  const [reason, setReason] = useState("Optimal gas + liquidity combination.");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(94);
  const [bridgeHealth, setBridgeHealth] = useState("99.8% uptime");
  const [mevForecast, setMevForecast] = useState("Low risk - Flashbots + privacy RPC");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getRecommendation();
        setPath(res.recommended.path);
        setReason(res.recommended.reason);
        setAlternatives(res.recommended.alternatives);
        setConfidence(res.recommended.confidence);
        setBridgeHealth(res.recommended.bridgeHealth);
        setMevForecast(res.recommended.mevForecast);
      } catch { /* use defaults */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">AI Solver</span>
          <Sparkles className="w-3 h-3 text-matrix-yellow" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
        </div>
      </div>
    );
  }

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
            confidence >= 90 ? "bg-matrix-green/10 text-matrix-green" : "bg-matrix-yellow/10 text-matrix-yellow"
          )}>
            {confidence}% confidence
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {path.split(" → ").map((step, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-2xs font-mono text-surface-300 bg-matrix-bg px-1.5 py-0.5 rounded-sm border border-surface-800">
                {step}
              </span>
              {i < path.split(" → ").length - 1 && (
                <ChevronRight className="w-2.5 h-2.5 text-surface-600" />
              )}
            </span>
          ))}
        </div>

        <div className="space-y-1">
          <span className="text-2xs text-surface-500 uppercase tracking-wider">Why this route</span>
          <p className="text-2xs text-surface-400 leading-relaxed">{reason}</p>
        </div>

        {alternatives.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-2xs text-surface-500 uppercase tracking-wider">Alternatives</span>
            {alternatives.map((alt, i) => (
              <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-sm bg-matrix-bg border border-surface-800">
                <span className="text-2xs text-surface-600 font-mono mt-0.5">#{i + 1}</span>
                <span className="text-2xs text-surface-400">{alt}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-800">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-matrix-green" />
            <div>
              <div className="text-2xs text-surface-500">Bridge</div>
              <div className="text-2xs font-mono text-matrix-green">{bridgeHealth}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-matrix-accent" />
            <div>
              <div className="text-2xs text-surface-500">MEV Risk</div>
              <div className="text-2xs font-mono text-matrix-accent">{mevForecast.includes("Low") ? "Low" : "Medium"}</div>
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
