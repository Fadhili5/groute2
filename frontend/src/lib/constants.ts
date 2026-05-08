export const CHAINS = [
  { id: "ethereum", name: "Ethereum", shortName: "ETH" },
  { id: "arbitrum", name: "Arbitrum", shortName: "ARB" },
  { id: "base", name: "Base", shortName: "BASE" },
  { id: "solana", name: "Solana", shortName: "SOL" },
  { id: "avalanche", name: "Avalanche", shortName: "AVAX" },
  { id: "bnb", name: "BNB Chain", shortName: "BNB" },
] as const;

export const TOKENS = [
  { symbol: "USDC", name: "USD Coin", decimals: 6 },
  { symbol: "USDT", name: "Tether", decimals: 6 },
  { symbol: "ETH", name: "Ether", decimals: 18 },
  { symbol: "BTC", name: "Bitcoin", decimals: 8 },
  { symbol: "SOL", name: "Solana", decimals: 9 },
  { symbol: "AVAX", name: "Avalanche", decimals: 18 },
] as const;

export const BRIDGES = [
  "LayerZero",
  "Wormhole",
  "Across",
  "Stargate",
  "Hop",
  "CCTP",
] as const;

export const CONTRACT_ADDRESSES = {
  intentRouter: "0x0000000000000000000000000000000000000001",
  fragmentVault: "0x0000000000000000000000000000000000000002",
  routeRegistry: "0x0000000000000000000000000000000000000003",
  settlementVerifier: "0x0000000000000000000000000000000000000004",
  privacyScoreOracle: "0x0000000000000000000000000000000000000005",
  treasuryFeeCollector: "0x0000000000000000000000000000000000000006",
  governance: "0x0000000000000000000000000000000000000007",
  relayerRegistry: "0x0000000000000000000000000000000000000008",
} as const;

export const API_BASE = "/api";
