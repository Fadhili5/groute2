export interface Chain {
  id: string;
  name: string;
  shortName: string;
  liquidity: number;
  spread: number;
  gas: number;
  bridgeFee: number;
  slippage: number;
  latency: number;
  privacy: number;
  mev: number;
  eta: string;
  status: "healthy" | "degraded" | "down";
}

export interface RouteFragment {
  id: string;
  type: "wallet" | "fragment" | "split" | "bridge" | "dex" | "swap" | "liquidity" | "settlement" | "settle";
  label: string;
  cost: number;
  latency: number;
  privacyScore: number;
  confidence: number;
  expectedReturn: number;
  status: "pending" | "active" | "completed" | "failed";
}

export interface RouteVisualization {
  id: string;
  fragments: RouteFragment[];
  totalCost: number;
  totalLatency: number;
  avgPrivacyScore: number;
  avgConfidence: number;
  totalReturn: number;
}

export interface AIRecommendation {
  path: string;
  reason: string;
  alternatives: string[];
  confidence: number;
  bridgeHealth: string;
  mevForecast: string;
}

export interface ExecutionOrder {
  id: string;
  sourceAsset: string;
  destinationAsset: string;
  sourceChain: string;
  destinationChain: string;
  amount: number;
  privacyMode: "on" | "off";
  fragmentationMode: "auto" | "manual";
  slippageTolerance: number;
  bridgePreference: string;
  mevGuard: "on" | "off";
  status: "draft" | "simulated" | "optimized" | "executing" | "completed" | "failed";
  timestamp: number;
  progress?: number;
  stage?: string;
  txHash?: string;
  fragments?: number;
}

export interface LiquidityPool {
  chain: string;
  token: string;
  depth: number;
  utilization: number;
  apy: number;
  volume24h: number;
  fee: number;
  impermanentLoss: number;
}

export interface SettlementData {
  txHash: string;
  routeId: string;
  proofHash: string;
  state: "pending" | "confirmed" | "failed" | "finalized";
  fees: number;
  relayer: string;
  confirmations: number;
  timestamp: number;
}

export interface Alert {
  id: string;
  type: "bridge_outage" | "route_success" | "mev_event" | "liquidity_spike" | "relayer_failure" | "gas_spike";
  severity: "info" | "warning" | "critical";
  message: string;
  chain?: string;
  timestamp: number;
  read: boolean;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  pnl: number;
  chain: string;
  change24h: number;
}

export interface SystemHealth {
  network: "connected" | "disconnected" | "degraded";
  relayers: number;
  blockHeight: number;
  apiHealth: "healthy" | "degraded" | "down";
}

export interface KPI {
  tvl: number;
  volume24h: number;
  routesExecuted: number;
  mevProtected: number;
}

export interface TickerItem {
  type: "chain" | "route" | "alert" | "bridge" | "gas";
  message: string;
  severity?: "info" | "warning" | "critical";
}
