"use client";

import { useState, useEffect } from "react";
import { cn, shortenAddress, shortenTxHash, formatTimestamp } from "@/lib/utils";
import { FileCheck, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { SettlementData } from "@/types";

function createSample(): SettlementData {
  const now = Date.now();
  return {
    txHash: "0x7f3c8a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
    routeId: "0x9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
    proofHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    state: "confirmed",
    fees: 12.45,
    relayer: "0x8f3c7a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
    confirmations: 32,
    timestamp: now - 30000,
  };
}

const STATE_ICONS: Record<string, any> = {
  pending: Clock,
  confirmed: CheckCircle2,
  finalized: CheckCircle2,
  failed: XCircle,
};

const STATE_COLORS: Record<string, string> = {
  pending: "text-matrix-yellow",
  confirmed: "text-matrix-green",
  finalized: "text-matrix-accent",
  failed: "text-matrix-red",
};

export function SettlementInspector() {
  const [mounted, setMounted] = useState(false);
  const [txInput, setTxInput] = useState("");
  const [settlement] = useState<SettlementData>(() => createSample());
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleInspect = () => {
    if (!txInput.trim()) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  const StateIcon = STATE_ICONS[settlement.state] || Clock;
  const ts = mounted ? formatTimestamp(settlement.timestamp) : "00:00:00";

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Settlement Inspector</span>
        <button
          onClick={handleInspect}
          disabled={loading}
          className="btn !py-0.5 text-2xs"
        >
          {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Inspect"}
        </button>
      </div>

      <div className="flex-shrink-0 px-3 py-1.5 border-b border-matrix-border">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={txInput}
            onChange={(e) => setTxInput(e.target.value)}
            placeholder="Search tx hash or route ID..."
            className="input flex-1 text-2xs"
          />
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
        <Row label="Transaction" value={shortenTxHash(settlement.txHash)} mono />
        <Row label="Route ID" value={shortenAddress(settlement.routeId)} mono />
        <Row label="Proof Hash" value={shortenTxHash(settlement.proofHash)} mono />

        <div className="flex items-center justify-between py-1 px-2 rounded-sm bg-matrix-bg border border-surface-800">
          <span className="text-2xs text-surface-500 uppercase tracking-wider">State</span>
          <div className="flex items-center gap-1.5">
            <StateIcon className={cn("w-3 h-3", STATE_COLORS[settlement.state])} />
            <span className={cn("text-2xs font-mono font-semibold uppercase", STATE_COLORS[settlement.state])}>
              {settlement.state}
            </span>
          </div>
        </div>

        <Row label="Fees" value={`${settlement.fees} USDC`} mono />
        <Row label="Relayer" value={shortenAddress(settlement.relayer)} mono />
        <Row label="Confirmations" value={`${settlement.confirmations}/64`} mono />
        <Row label="Timestamp" value={ts} mono />

        <div className="pt-2 border-t border-surface-800">
          <button className="w-full btn text-2xs flex items-center justify-center gap-1">
            <FileCheck className="w-3 h-3" />
            Verify On-Chain
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-2xs text-surface-500 uppercase tracking-wider">{label}</span>
      <span className={cn("text-2xs", mono ? "font-mono text-surface-300" : "text-surface-400")}>{value}</span>
    </div>
  );
}
