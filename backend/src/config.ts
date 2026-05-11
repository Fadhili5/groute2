import "dotenv/config";

function requiredEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.warn(`[config] WARNING: ${name} not set, using empty/default value`);
    return "";
  }
  return val;
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  database: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ghostroute",
  },

  rpc: {
    ethereum: process.env.ETH_RPC || "https://eth-mainnet.g.alchemy.com/v2/demo",
    arbitrum: process.env.ARB_RPC || "https://arb-mainnet.g.alchemy.com/v2/demo",
    base: process.env.BASE_RPC || "https://base-mainnet.g.alchemy.com/v2/demo",
    solana: process.env.SOL_RPC || "https://api.mainnet-beta.solana.com",
    avalanche: process.env.AVAX_RPC || "https://avax-mainnet.g.alchemy.com/v2/demo",
    bnb: process.env.BNB_RPC || "https://bsc-dataseed.binance.org",
  },

  contracts: {
    intentRouter: requiredEnv("INTENT_ROUTER"),
    fragmentVault: requiredEnv("FRAGMENT_VAULT"),
    routeRegistry: requiredEnv("ROUTE_REGISTRY"),
    settlementVerifier: requiredEnv("SETTLEMENT_VERIFIER"),
  },

  zerog: {
    computeEndpoint: process.env.ZG_COMPUTE_ENDPOINT || "https://compute.0g.ai",
    storageEndpoint: process.env.ZG_STORAGE_ENDPOINT || "https://storage.0g.ai",
    daEndpoint: process.env.ZG_DA_ENDPOINT || "https://da.0g.ai",
  },
};
