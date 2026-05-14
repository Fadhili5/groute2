"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useSolverStore } from "@/stores";
import { PlayCircle, Search, Zap, Send, Loader2 } from "lucide-react";

const ASSETS = ["USDC", "USDT", "ETH", "BTC", "SOL", "AVAX"];
const CHAINS = ["Ethereum", "Arbitrum", "Base", "Solana", "Avalanche", "BNB Chain"];
const BRIDGES = ["LayerZero", "Wormhole", "Across", "Stargate", "Hop", "CCTP"];

export function ExecutionBlotter() {
  const [sourceAsset, setSourceAsset] = useState("USDC");
  const [destAsset, setDestAsset] = useState("ETH");
  const [sourceChain, setSourceChain] = useState("Arbitrum");
  const [destChain, setDestChain] = useState("Ethereum");
  const [amount, setAmount] = useState("50000");
  const [privacyMode, setPrivacyMode] = useState(true);
  const [fragMode, setFragMode] = useState(true);
  const [slippage, setSlippage] = useState("0.5");
  const [bridge, setBridge] = useState("LayerZero");
  const [mevGuard, setMevGuard] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const loadingRef = useRef(false);
  const { addOrder } = useSolverStore();

  const getFormParams = () => ({
    sourceAsset,
    destinationAsset: destAsset,
    sourceChain,
    destinationChain: destChain,
    amount: parseFloat(amount) || 0,
    privacyMode,
    fragmentationMode: fragMode,
    slippageTolerance: parseFloat(slippage) || 0.5,
    bridgePreference: bridge,
    mevGuard,
  });

  const handleSimulate = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus("simulating");
    setResult(null);
    try {
      const res = await api.simulate(getFormParams());
      setResult(res);
      setStatus("simulated");
    } catch {
      setStatus(null);
    }
    loadingRef.current = false;
  };

  const handleOptimize = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus("optimizing");
    try {
      const res = await api.optimize(getFormParams());
      setResult((prev: any) => ({ ...prev, ...res }));
      setStatus("optimized");
    } catch {
      setStatus(null);
    }
    loadingRef.current = false;
  };

  const handleExecute = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus("executing");
    try {
      const res = await api.execute(getFormParams());
      setResult((prev: any) => ({ ...prev, order: res }));
      addOrder(res);
      // Poll for completion
      const check = setInterval(async () => {
        try {
          const order = await api.getOrder(res.id);
          if (order.status === "completed") {
            setStatus("completed");
            setResult((prev: any) => ({ ...prev, order }));
            clearInterval(check);
            loadingRef.current = false;
          }
        } catch { clearInterval(check); loadingRef.current = false; }
      }, 2000);
    } catch {
      setStatus(null);
      loadingRef.current = false;
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Execution Blotter</span>
        {status && (
          <span className={cn(
            "panel-badge text-2xs",
            status === "simulated" && "bg-matrix-green/10 text-matrix-green",
            status === "optimized" && "bg-matrix-accent/10 text-matrix-accent",
            status === "executing" && "bg-matrix-yellow/10 text-matrix-yellow animate-pulse-slow",
            status === "completed" && "bg-matrix-green/10 text-matrix-green",
            (status === "simulating" || status === "optimizing") && "bg-surface-800 text-surface-400"
          )}>
            {status === "simulating" || status === "optimizing" ? (
              <span className="flex items-center gap-1"><Loader2 className="w-2 h-2 animate-spin" />{status.toUpperCase()}</span>
            ) : status.toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 gap-x-3 gap-y-2 auto-rows-min">
        <SelectField label="Source Asset" value={sourceAsset} onChange={setSourceAsset} options={ASSETS} />
        <SelectField label="Dest Asset" value={destAsset} onChange={setDestAsset} options={ASSETS} />
        <SelectField label="Source Chain" value={sourceChain} onChange={setSourceChain} options={CHAINS} />
        <SelectField label="Dest Chain" value={destChain} onChange={setDestChain} options={CHAINS} />

        <div className="col-span-2">
          <label className="text-2xs text-surface-500 uppercase tracking-wider block mb-1">Amount</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input w-full"
            placeholder="Enter amount..."
          />
        </div>

        <ToggleField label="Privacy Mode" value={privacyMode} onChange={setPrivacyMode} />
        <ToggleField label="Fragmentation" value={fragMode} onChange={setFragMode} />

        <div>
          <label className="text-2xs text-surface-500 uppercase tracking-wider block mb-1">Slippage</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="input w-full"
            />
            <span className="text-2xs text-surface-500">%</span>
          </div>
        </div>

        <SelectField label="Bridge" value={bridge} onChange={setBridge} options={BRIDGES} />

        <div className="col-span-2">
          <ToggleField label="MEV Guard" value={mevGuard} onChange={setMevGuard} />
        </div>

        {result && (
          <div className="col-span-2 bg-matrix-bg border border-surface-800 rounded-sm p-2 space-y-1">
            <div className="text-2xs text-surface-500">Route: {result.route || result.optimizedRoute}</div>
            {result.gas && <div className="text-2xs text-surface-400">Gas: {typeof result.gas === 'number' ? `$${result.gas.toFixed(4)}` : result.gas}</div>}
            {result.bridgeFee && <div className="text-2xs text-surface-400">Bridge Fee: ${result.bridgeFee.toFixed(2)}</div>}
            {result.confidence && <div className="text-2xs text-matrix-green">Confidence: {result.confidence}%</div>}
            {result.eta && <div className="text-2xs text-surface-400">ETA: {result.eta}</div>}
            {result.savings && <div className="text-2xs text-matrix-green">Savings: {result.savings}</div>}
            {result.order?.txHash && (
              <div className="text-2xs font-mono text-matrix-accent">Tx: {result.order.txHash.slice(0, 18)}...{result.order.txHash.slice(-6)}</div>
            )}
          </div>
        )}

        <div className="col-span-2 flex items-center gap-2 pt-2">
          <button
            onClick={handleSimulate}
            disabled={loadingRef.current}
            className="btn flex-1 flex items-center justify-center gap-1.5"
          >
            {status === "simulating" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            Simulate
          </button>
          <button
            onClick={handleOptimize}
            disabled={loadingRef.current || !status}
            className="btn flex-1 flex items-center justify-center gap-1.5"
          >
            {status === "optimizing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Optimize
          </button>
          <button
            onClick={handleExecute}
            disabled={loadingRef.current || !status || status === "simulating" || status === "optimizing"}
            className={cn(
              "btn flex-1 flex items-center justify-center gap-1.5",
              (status === "simulated" || status === "optimized") ? "btn-success" : ""
            )}
          >
            {status === "executing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Execute
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-2xs text-surface-500 uppercase tracking-wider block mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="select w-full">
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-2xs text-surface-500 uppercase tracking-wider">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-8 h-4 rounded-full transition-colors",
          value ? "bg-ghost-700" : "bg-surface-800"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
            value ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
