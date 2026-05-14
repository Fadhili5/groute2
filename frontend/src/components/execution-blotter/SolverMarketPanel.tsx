"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSolverMarketStore } from "@/stores/solver-market-store";
import { 
  Gavel, Clock, CheckCircle2, XCircle, Loader2, Crown, Plus, 
  RefreshCw, TrendingUp, Users, Zap, AlertCircle 
} from "lucide-react";

interface AuctionFormData {
  intentId: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  startPrice: number;
}

interface BidFormData {
  price: number;
  estimatedGas: number;
  executionTime: number;
  routeId: string;
}

const TOKENS = ["USDC", "USDT", "ETH", "BTC", "WBTC", "SOL", "AVAX", "ARB", "BNB"];

export function SolverMarketPanel() {
  const [activeTab, setActiveTab] = useState<"auctions" | "solvers" | "leaderboard">("auctions");
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [showSubmitBid, setShowSubmitBid] = useState(false);
  const [auctionForm, setAuctionForm] = useState<AuctionFormData>({
    intentId: "",
    tokenIn: "USDC",
    tokenOut: "ETH",
    amountIn: 50000,
    startPrice: 100,
  });
  const [bidForm, setBidForm] = useState<BidFormData>({
    price: 95,
    estimatedGas: 150000,
    executionTime: 3,
    routeId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    solvers,
    auctions,
    leaderboard,
    stats,
    selectedAuction,
    isLoading,
    error: storeError,
    fetchSolvers,
    fetchAuctions,
    fetchLeaderboard,
    fetchStats,
    createAuction,
    submitBid,
    settleAuction,
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
      fetchStats();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateAuction = async () => {
    setError(null);
    try {
      await createAuction(auctionForm);
      setSuccess("Auction created successfully!");
      setShowCreateAuction(false);
      setAuctionForm({
        intentId: "",
        tokenIn: "USDC",
        tokenOut: "ETH",
        amountIn: 50000,
        startPrice: 100,
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedAuction) return;
    setError(null);
    try {
      await submitBid({
        auctionId: selectedAuction.id,
        ...bidForm,
      });
      setSuccess("Bid submitted successfully!");
      setShowSubmitBid(false);
      setBidForm({
        price: 95,
        estimatedGas: 150000,
        executionTime: 3,
        routeId: "",
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSettleAuction = async () => {
    if (!selectedAuction) return;
    setError(null);
    try {
      await settleAuction(selectedAuction.id);
      setSuccess("Auction settled!");
      fetchAuctions();
      fetchLeaderboard();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const formatAddress = (addr: string) => `${addr?.slice(0, 6) || "unknown"}...${addr?.slice(-4) || "0000"}`;
  const formatTime = (ts: number) => {
    const diff = ts - Date.now();
    if (diff < 0) return "Ended";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border border-[#1a2332]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#1a2332]">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-200">Solver Marketplace</span>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <div className="flex gap-3 text-xs">
              <span className="text-green-400">{stats.activeAuctions} active</span>
              <span className="text-blue-400">{stats.settledAuctions} settled</span>
            </div>
          )}
          <button
            onClick={() => { fetchAuctions(); fetchLeaderboard(); fetchStats(); }}
            className="p-1 rounded hover:bg-surface-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-3 mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}
      {success && (
        <div className="mx-3 mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-400">{success}</span>
        </div>
      )}

      {/* Tabs */}
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Auctions Tab */}
            {activeTab === "auctions" && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowCreateAuction(true)}
                  className="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Auction
                </button>

                {auctions.length === 0 ? (
                  <div className="text-center py-8">
                    <Gavel className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No active auctions</p>
                    <p className="text-xs text-gray-600 mt-1">Create one to get started</p>
                  </div>
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
                            auction.state === "Cancelled" && "bg-red-500/20 text-red-400",
                            auction.state === "Created" && "bg-blue-500/20 text-blue-400"
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
                        <span className={cn(
                          "text-xs",
                          auction.state === "Bidding" ? "text-green-400" : "text-gray-400"
                        )}>
                          ${auction.currentPrice?.toFixed(2) || auction.startPrice?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Solvers Tab */}
            {activeTab === "solvers" && (
              <div className="space-y-2">
                {solvers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No registered solvers</p>
                  </div>
                ) : (
                  solvers.map((solver) => (
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
                          <span className="text-gray-300">{solver.totalSolved?.toLocaleString() || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Success</span>
                          <span className="text-green-400">{solver.successRate?.toFixed(1) || 0}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Avg Time</span>
                          <span className="text-cyan-400">{solver.averageExecutionTime || 0}s</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-1 border-t border-[#1a2332] flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          <Users className="w-3 h-3 inline mr-1" />
                          Stake: ${solver.stakedAmount?.toLocaleString() || 0}
                        </span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          solver.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                        )}>
                          {solver.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === "leaderboard" && (
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <Crown className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No leaderboard data</p>
                  </div>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div
                      key={entry.id || idx}
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
                        <span className="text-sm font-medium text-gray-200">{entry.name || "Unknown"}</span>
                        {idx === 0 && <Crown className="w-3 h-3 text-yellow-400" />}
                      </div>
                      <div className="flex gap-4 mt-1 ml-7 text-xs">
                        <span className="text-gray-400">{entry.totalSolved || 0} solved</span>
                        <span className="text-green-400">{entry.successRate?.toFixed(1) || 0}% success</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Auction Details */}
      {selectedAuction && (
        <div className="p-3 border-t border-[#1a2332]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Auction Details</span>
            <button
              onClick={() => setSelectedAuction(null)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-[#0d1117] p-1.5 rounded">
              <span className="text-gray-500 block">Intent ID</span>
              <span className="text-gray-300 font-mono">{formatAddress(selectedAuction.intentId)}</span>
            </div>
            <div className="bg-[#0d1117] p-1.5 rounded">
              <span className="text-gray-500 block">Amount</span>
              <span className="text-cyan-400">${selectedAuction.amountIn?.toLocaleString()}</span>
            </div>
            <div className="bg-[#0d1117] p-1.5 rounded">
              <span className="text-gray-500 block">Start Price</span>
              <span className="text-gray-300">${selectedAuction.startPrice}</span>
            </div>
            <div className="bg-[#0d1117] p-1.5 rounded">
              <span className="text-gray-500 block">Current Price</span>
              <span className="text-green-400">${selectedAuction.currentPrice}</span>
            </div>
          </div>

          {selectedAuction.state === "Bidding" && (
            <button
              onClick={() => setShowSubmitBid(true)}
              className="w-full py-1.5 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              Submit Bid
            </button>
          )}

          {selectedAuction.bids && selectedAuction.bids.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500 block mb-1">Bids ({selectedAuction.bids.length})</span>
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
                      ${bid.price?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Auction Modal */}
      {showCreateAuction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0e17] border border-[#1a2332] rounded-lg p-4 w-80">
            <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Create Auction
            </h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Intent ID</label>
                <input
                  type="text"
                  value={auctionForm.intentId}
                  onChange={(e) => setAuctionForm({ ...auctionForm, intentId: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                  placeholder="0x..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Token In</label>
                  <select
                    value={auctionForm.tokenIn}
                    onChange={(e) => setAuctionForm({ ...auctionForm, tokenIn: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                  >
                    {TOKENS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Token Out</label>
                  <select
                    value={auctionForm.tokenOut}
                    onChange={(e) => setAuctionForm({ ...auctionForm, tokenOut: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                  >
                    {TOKENS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Amount</label>
                  <input
                    type="number"
                    value={auctionForm.amountIn}
                    onChange={(e) => setAuctionForm({ ...auctionForm, amountIn: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Start Price</label>
                  <input
                    type="number"
                    value={auctionForm.startPrice}
                    onChange={(e) => setAuctionForm({ ...auctionForm, startPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowCreateAuction(false)}
                className="flex-1 py-1.5 bg-surface-800 rounded text-xs text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAuction}
                className="flex-1 py-1.5 bg-cyan-500 rounded text-xs text-black font-medium hover:bg-cyan-400"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Bid Modal */}
      {showSubmitBid && selectedAuction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a0e17] border border-[#1a2332] rounded-lg p-4 w-80">
            <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              Submit Bid
            </h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Your Price ($)</label>
                <input
                  type="number"
                  value={bidForm.price}
                  onChange={(e) => setBidForm({ ...bidForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Est. Gas</label>
                  <input
                    type="number"
                    value={bidForm.estimatedGas}
                    onChange={(e) => setBidForm({ ...bidForm, estimatedGas: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Exec Time (s)</label>
                  <input
                    type="number"
                    value={bidForm.executionTime}
                    onChange={(e) => setBidForm({ ...bidForm, executionTime: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Route ID</label>
                <input
                  type="text"
                  value={bidForm.routeId}
                  onChange={(e) => setBidForm({ ...bidForm, routeId: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#1a2332] rounded px-2 py-1 text-xs text-gray-300"
                  placeholder="0x..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowSubmitBid(false)}
                className="flex-1 py-1.5 bg-surface-800 rounded text-xs text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBid}
                className="flex-1 py-1.5 bg-green-500 rounded text-xs text-black font-medium hover:bg-green-400"
              >
                Submit Bid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}