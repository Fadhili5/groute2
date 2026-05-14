import "dotenv/config";

function requiredEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return "";
  }
  return val;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  redis: {
    url: optionalEnv("REDIS_URL", "redis://localhost:6379"),
  },

  database: {
    url: optionalEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ghostroute"),
  },

  rpc: {
    ethereum: optionalEnv("ETH_RPC", "https://eth-mainnet.g.alchemy.com/v2/demo"),
    arbitrum: optionalEnv("ARB_RPC", "https://arb-mainnet.g.alchemy.com/v2/demo"),
    base: optionalEnv("BASE_RPC", "https://base-mainnet.g.alchemy.com/v2/demo"),
    solana: optionalEnv("SOL_RPC", "https://api.mainnet-beta.solana.com"),
    avalanche: optionalEnv("AVAX_RPC", "https://avax-mainnet.g.alchemy.com/v2/demo"),
    bnb: optionalEnv("BNB_RPC", "https://bsc-dataseed.binance.org"),
  },

  contracts: {
    intentRouter: requiredEnv("INTENT_ROUTER"),
    fragmentVault: requiredEnv("FRAGMENT_VAULT"),
    routeRegistry: requiredEnv("ROUTE_REGISTRY"),
    settlementVerifier: requiredEnv("SETTLEMENT_VERIFIER"),
  },

  zerog: {
    computeEndpoint: optionalEnv("ZG_COMPUTE_ENDPOINT", "https://compute.0g.ai"),
    storageEndpoint: optionalEnv("ZG_STORAGE_ENDPOINT", "https://storage.0g.ai"),
    daEndpoint: optionalEnv("ZG_DA_ENDPOINT", "https://da.0g.ai"),
  },
};
