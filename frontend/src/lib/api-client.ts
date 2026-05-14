import type { Chain, RouteVisualization, AIRecommendation, ExecutionOrder, SettlementData, Alert, WatchlistItem, SystemHealth, KPI, TickerItem, LiquidityPool } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

class ApiClient {
  private base: string;

  constructor(base: string) {
    this.base = base;
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `API error: ${res.status}`);
    }
    return res.json();
  }

  // Market
  async getChains(): Promise<{ chains: Chain[] }> {
    return this.fetch("/market/chains");
  }

  async getChain(id: string): Promise<Chain> {
    return this.fetch(`/market/chains/${id}`);
  }

  async getLiquidity(): Promise<{ pools: LiquidityPool[] }> {
    return this.fetch("/market/liquidity");
  }

  async getTicker(): Promise<{ items: TickerItem[] }> {
    return this.fetch("/market/ticker");
  }

  // Execution
  async simulate(params: {
    sourceAsset: string;
    destinationAsset: string;
    sourceChain: string;
    destinationChain: string;
    amount: number;
    privacyMode: boolean;
    fragmentationMode: boolean;
    slippageTolerance: number;
    bridgePreference: string;
    mevGuard: boolean;
  }): Promise<any> {
    return this.fetch("/execution/simulate", { method: "POST", body: JSON.stringify(params) });
  }

  async optimize(params: any): Promise<any> {
    return this.fetch("/execution/optimize", { method: "POST", body: JSON.stringify(params) });
  }

  async execute(params: any): Promise<ExecutionOrder> {
    return this.fetch("/execution/execute", { method: "POST", body: JSON.stringify(params) });
  }

  async getOrders(): Promise<ExecutionOrder[]> {
    return this.fetch("/execution/orders");
  }

  async getOrder(id: string): Promise<ExecutionOrder> {
    return this.fetch(`/execution/orders/${id}`);
  }

  // Settlement
  async getProofs(): Promise<{ proofs: SettlementData[] }> {
    return this.fetch("/settlement/proofs");
  }

  async verifyTx(txHash: string): Promise<any> {
    return this.fetch(`/settlement/verify/${txHash}`);
  }

  async inspect(params: { txHash?: string; routeId?: string }): Promise<SettlementData> {
    return this.fetch("/settlement/inspect", { method: "POST", body: JSON.stringify(params) });
  }

  // Routes
  async getRoutes(): Promise<{ routes: any[] }> {
    return this.fetch("/routes");
  }

  async getRecommendation(): Promise<{ recommended: AIRecommendation }> {
    return this.fetch("/routes/recommend");
  }

  async simulateRoute(): Promise<any> {
    return this.fetch("/routes/simulate");
  }

  async compareChains(params: { asset?: string; chain1?: string; chain2?: string }): Promise<any> {
    return this.fetch("/routes/compare", { method: "POST", body: JSON.stringify(params) });
  }

  // Alerts
  async getAlerts(): Promise<{ alerts: Alert[] }> {
    return this.fetch("/alerts");
  }

  async getUnreadAlerts(): Promise<{ unread: number; alerts: Alert[] }> {
    return this.fetch("/alerts/unread");
  }

  async markAlertRead(id: string): Promise<{ success: boolean }> {
    return this.fetch(`/alerts/${id}/read`, { method: "PUT" });
  }

  async createAlert(data: { type: string; severity: string; message: string; chainId?: string }): Promise<Alert> {
    return this.fetch("/alerts", { method: "POST", body: JSON.stringify(data) });
  }

  // System
  async getHealth(): Promise<{ status: string; timestamp: number; uptime: number }> {
    return this.fetch("/health");
  }

  async getKpi(): Promise<KPI> {
    return this.fetch("/kpi");
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return this.fetch("/system/health");
  }

  // Solver
  async getSolvers(): Promise<{ solvers: any[]; total: number; totalVolume: number }> {
    return this.fetch("/solver/solvers");
  }

  async getSolver(id: string): Promise<any> {
    return this.fetch(`/solver/solvers/${id}`);
  }

  async getAuctions(params?: { state?: string; limit?: string }): Promise<{ auctions: any[]; total: number; active: number }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.fetch(`/solver/auctions${query ? `?${query}` : ""}`);
  }

  async getAuction(id: string): Promise<any> {
    return this.fetch(`/solver/auctions/${id}`);
  }

  async createAuction(data: { intentId: string; tokenIn: string; tokenOut: string; amountIn: number; startPrice: number }): Promise<any> {
    return this.fetch("/solver/auctions", { method: "POST", body: JSON.stringify(data) });
  }

  async submitBid(data: { auctionId: string; price: number; estimatedGas: number; executionTime: number; routeId: string }): Promise<any> {
    return this.fetch(`/solver/auctions/${data.auctionId}/bids`, { method: "POST", body: JSON.stringify(data) });
  }

  async settleAuction(auctionId: string): Promise<any> {
    return this.fetch(`/solver/auctions/${auctionId}/settle`, { method: "POST" });
  }

  async getLeaderboard(): Promise<{ leaderboard: any[]; updatedAt: number }> {
    return this.fetch("/solver/leaderboard");
  }

  async getSolverStats(): Promise<any> {
    return this.fetch("/solver/stats");
  }
}

export const api = new ApiClient(API_BASE);
