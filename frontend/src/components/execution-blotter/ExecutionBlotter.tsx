"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PlayCircle, Search, Zap, Send } from "lucide-react";

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

  const handleSimulate = () => {
    setStatus("simulating");
    setTimeout(() => {
      setStatus("simulated");
    }, 1500);
  };

  const handleOptimize = () => {
    setStatus("optimizing");
    setTimeout(() => {
      setStatus("optimized");
    }, 2000);
  };

  const handleExecute = () => {
    setStatus("executing");
    setTimeout(() => {
      setStatus("completed");
    }, 3000);
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
            status === "simulating" && "bg-surface-800 text-surface-400",
            status === "optimizing" && "bg-surface-800 text-surface-400"
          )}>
            {status.toUpperCase()}
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

        <div className="col-span-2 flex items-center gap-2 pt-2">
          <button
            onClick={handleSimulate}
            disabled={status === "executing" || status === "simulating"}
            className="btn flex-1 flex items-center justify-center gap-1.5"
          >
            <Search className="w-3 h-3" />
            Simulate
          </button>
          <button
            onClick={handleOptimize}
            disabled={status === "executing" || status === "optimizing"}
            className="btn flex-1 flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3 h-3" />
            Optimize
          </button>
          <button
            onClick={handleExecute}
            disabled={!status || status === "executing"}
            className={cn(
              "btn flex-1 flex items-center justify-center gap-1.5",
              status === "simulated" || status === "optimized"
                ? "btn-success"
                : ""
            )}
          >
            <Send className="w-3 h-3" />
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
