"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSolverMarketStore } from "@/stores/solver-market-store";
import { TrendingUp, Users, Gavel, Clock, CheckCircle2, XCircle, Loader2, Crown } from "lucide-react";

export function SolverMarketPanel() {
  const [activeTab, setActiveTab] = useState<"auctions" | "solvers" | "leaderboard">("auctions");
  const {
    solvers,
    auctions,
    leaderboard,
    stats,
    selectedAuction,
    isLoading,
    fetchSolvers,
    fetchAuctions,
    fetchLeaderboard,
    fetchStats,
    setSelectedAuction,
  } = useSolverMarketStore();

  useEffect(() => {
    fetchSolvers();
    fetchAuctions();
    fetchLeaderboard();
    fetchStats();
    const interval = setInterval(() => {
      fetchAuctions();
      fetchLeaderboard();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatTime = (ts: number) => {
    const diff = ts - Date.now();
    if (diff < 0) return "Ended";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border border-[#1a2332]">
      <div className="flex items-center justify-between p-3 border-b border-[#1a2332]">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-200">Solver Marketplace</span>
        </div>
        {stats && (
          <div className="flex gap-3 text-xs">
            <span className="text-green-400">{stats.activeAuctions} active</span>
            <span className="text-blue-400">{stats.settledAuctions} settled</span>
          </div>
        )}
      </div>

      <div className="flex border-b border-[#1a2332]">
        {(["auctions", "solvers", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400"
                : "text-gray-400 hover:text-gray-300"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "auctions" && (
              <div className="space-y-2">
                {auctions.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No active auctions</p>
                ) : (
                  auctions.slice(0, 10).map((auction) => (
                    <div
                      key={auction.id}
                      onClick={() => setSelectedAuction(auction)}
                      className={cn(
                        "p-2 rounded border cursor-pointer transition-colors",
                        selectedAuction?.id === auction.id
                          ? "border-cyan-500/50 bg-cyan-500/5"
                          : "border-[#1a2332] hover:border-cyan-500/30"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-300 font-mono">{formatAddress(auction.id)}</span>
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            auction.state === "Bidding" && "bg-yellow-500/20 text-yellow-400",
                            auction.state === "Settled" && "bg-green-500/20 text-green-400",
                            auction.state === "Cancelled" && "bg-red-500/20 text-red-400"
                          )}
                        >
                          {auction.state}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">
                          {auction.tokenIn} → {auction.tokenOut}
                        </span>
                        <span className="text-cyan-400">${auction.amountIn.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTime(auction.deadline)}
                        </span>
                        <span className="text-xs text-green-400">
                          ${auction.currentPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "solvers" && (
              <div className="space-y-2">
                {solvers.map((solver) => (
                  <div
                    key={solver.id}
                    className="p-2 rounded border border-[#1a2332] hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-200">{solver.name}</span>
                      <span className="text-xs text-gray-500">{formatAddress(solver.address)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div>
                        <span className="text-gray-500 block">Solved</span>
                        <span className="text-gray-300">{solver.totalSolved.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Success</span>
                        <span className="text-green-400">{solver.successRate.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Avg Time</span>
                        <span className="text-cyan-400">{solver.averageExecutionTime}s</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-1 border-t border-[#1a2332]">
                      <span className="text-xs text-gray-500">
                        <Users className="w-3 h-3 inline mr-1" />
                        Stake: ${solver.stakedAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "leaderboard" && (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "p-2 rounded border",
                      idx === 0
                        ? "border-yellow-500/50 bg-yellow-500/5"
                        : "border-[#1a2332]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-xs font-bold",
                          idx === 0 && "bg-yellow-500 text-black",
                          idx === 1 && "bg-gray-400 text-black",
                          idx === 2 && "bg-amber-700 text-white",
                          idx > 2 && "bg-[#1a2332] text-gray-400"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-200">{entry.name}</span>
                      {idx === 0 && <Crown className="w-3 h-3 text-yellow-400" />}
                    </div>
                    <div className="flex gap-4 mt-1 ml-7 text-xs">
                      <span className="text-gray-400">{entry.totalSolved} solved</span>
                      <span className="text-green-400">{entry.successRate}% success</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedAuction && selectedAuction.bids && selectedAuction.bids.length > 0 && (
        <div className="p-3 border-t border-[#1a2332]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Bids ({selectedAuction.bids.length})</span>
            <button
              onClick={() => setSelectedAuction(null)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Close
            </button>
          </div>
          <div className="space-y-1 max-h-24 overflow-auto">
            {selectedAuction.bids.map((bid: any) => (
              <div key={bid.id} className="flex justify-between text-xs p-1 rounded bg-[#0d1117]">
                <span className="text-gray-400">{formatAddress(bid.solver)}</span>
                <span className={cn(
                  bid.state === "Accepted" && "text-green-400",
                  bid.state === "Rejected" && "text-red-400",
                  bid.state === "Submitted" && "text-yellow-400"
                )}>
                  {bid.state === "Accepted" && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                  {bid.state === "Rejected" && <XCircle className="w-3 h-3 inline mr-1" />}
                  ${bid.price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}