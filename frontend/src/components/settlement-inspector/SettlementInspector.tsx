"use client";

import { useState, useEffect } from "react";
import { cn, shortenAddress, shortenTxHash, formatTimestamp } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { FileCheck, Loader2, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import type { SettlementData } from "@/types";

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
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    api.getProofs()
      .then((res) => {
        if (res.proofs?.length) setSettlement(res.proofs[0]);
      })
      .catch(() => {});
  }, []);

  const handleInspect = async () => {
    if (!txInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyTx(txInput.trim());
      setSettlement({
        txHash: res.txHash,
        routeId: settlement?.routeId || "",
        proofHash: settlement?.proofHash || "",
        state: res.state,
        fees: settlement?.fees || 0,
        relayer: settlement?.relayer || "",
        confirmations: res.confirmations,
        timestamp: res.timestamp,
      });
    } catch {
      try {
        const res = await api.inspect({ txHash: txInput.trim() });
        setSettlement(res);
      } catch {
        setError("Transaction not found");
      }
    }
    setLoading(false);
  };

  if (!settlement) {
    return (
      <div className="panel h-full flex flex-col">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">Settlement Inspector</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
        </div>
      </div>
    );
  }

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
          {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Search className="w-2.5 h-2.5" />}
        </button>
      </div>

      <div className="flex-shrink-0 px-3 py-1.5 border-b border-matrix-border">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={txInput}
            onChange={(e) => setTxInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInspect()}
            placeholder="Search tx hash or route ID..."
            className="input flex-1 text-2xs"
          />
        </div>
        {error && <p className="text-2xs text-matrix-red mt-1">{error}</p>}
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
