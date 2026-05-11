import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CHAINS = [
  { name: "Ethereum", shortName: "ETH", chainId: 1, status: "healthy", liquidity: 842_000_000, spread: 0.02, gas: 12.4, bridgeFee: 0.05, slippage: 0.01, latency: 12, privacy: 85, mev: 92, eta: "12s" },
  { name: "Arbitrum", shortName: "ARB", chainId: 42161, status: "healthy", liquidity: 456_000_000, spread: 0.03, gas: 0.08, bridgeFee: 0.03, slippage: 0.02, latency: 3, privacy: 78, mev: 85, eta: "8s" },
  { name: "Base", shortName: "BASE", chainId: 8453, status: "healthy", liquidity: 234_000_000, spread: 0.04, gas: 0.06, bridgeFee: 0.04, slippage: 0.03, latency: 2, privacy: 72, mev: 80, eta: "6s" },
  { name: "Solana", shortName: "SOL", chainId: 101, status: "healthy", liquidity: 678_000_000, spread: 0.01, gas: 0.0002, bridgeFee: 0.02, slippage: 0.01, latency: 1, privacy: 45, mev: 60, eta: "4s" },
  { name: "Avalanche", shortName: "AVAX", chainId: 43114, status: "degraded", liquidity: 189_000_000, spread: 0.05, gas: 0.15, bridgeFee: 0.06, slippage: 0.04, latency: 5, privacy: 70, mev: 75, eta: "10s" },
  { name: "BNB Chain", shortName: "BNB", chainId: 56, status: "healthy", liquidity: 312_000_000, spread: 0.03, gas: 0.04, bridgeFee: 0.04, slippage: 0.02, latency: 4, privacy: 55, mev: 65, eta: "7s" },
];

const LIQUIDITY_POOLS = [
  { chainId: 1, token: "USDC", depth: 320, utilization: 72, apy: 4.2, volume24h: 456, fee: 0.003 },
  { chainId: 1, token: "USDT", depth: 280, utilization: 68, apy: 3.8, volume24h: 389, fee: 0.003 },
  { chainId: 1, token: "ETH", depth: 420, utilization: 81, apy: 2.1, volume24h: 234, fee: 0.005 },
  { chainId: 1, token: "BTC", depth: 150, utilization: 55, apy: 1.5, volume24h: 145, fee: 0.005 },
  { chainId: 42161, token: "USDC", depth: 220, utilization: 65, apy: 5.8, volume24h: 312, fee: 0.003 },
  { chainId: 42161, token: "USDT", depth: 180, utilization: 60, apy: 5.2, volume24h: 267, fee: 0.003 },
  { chainId: 42161, token: "ETH", depth: 310, utilization: 74, apy: 3.4, volume24h: 189, fee: 0.005 },
  { chainId: 8453, token: "USDC", depth: 140, utilization: 58, apy: 4.9, volume24h: 178, fee: 0.003 },
  { chainId: 8453, token: "ETH", depth: 190, utilization: 62, apy: 2.8, volume24h: 134, fee: 0.005 },
  { chainId: 101, token: "USDC", depth: 410, utilization: 81, apy: 6.9, volume24h: 534, fee: 0.003 },
  { chainId: 101, token: "SOL", depth: 380, utilization: 77, apy: 5.4, volume24h: 423, fee: 0.003 },
  { chainId: 43114, token: "USDC", depth: 95, utilization: 45, apy: 5.1, volume24h: 112, fee: 0.003 },
  { chainId: 56, token: "USDC", depth: 170, utilization: 55, apy: 4.4, volume24h: 223, fee: 0.003 },
  { chainId: 56, token: "BNB", depth: 230, utilization: 63, apy: 3.2, volume24h: 198, fee: 0.003 },
];

const ALERTS = [
  { type: "route_success", severity: "info", message: "Route 0x7f3c: 50,000 USDC ARB → ETH completed in 12.4s" },
  { type: "mev_event", severity: "warning", message: "MEV bot detected on Ethereum mempool — protection engaged", chainId: "ethereum" },
  { type: "bridge_outage", severity: "critical", message: "Wormhole: 4 relayers delayed on Avalanche path", chainId: "avalanche" },
  { type: "gas_spike", severity: "warning", message: "Base gas spike: 3.2 gwei (+240% in 5 min)", chainId: "base" },
  { type: "liquidity_spike", severity: "info", message: "Uniswap V3 ETH/USDC pool: +$42M depth added", chainId: "ethereum" },
  { type: "relayer_failure", severity: "warning", message: "Relayer node 0x8f3c missed 3 consecutive attestations" },
  { type: "route_success", severity: "info", message: "Route 0x9a1b: 25,000 USDT BASE → SOL completed in 6.2s" },
  { type: "gas_spike", severity: "warning", message: "Ethereum gas spike: 45 gwei (+180% in 3 min)", chainId: "ethereum" },
];

async function main() {
  // Chains
  const chainMap: Record<number, string> = {};
  for (const chain of CHAINS) {
    const created = await prisma.chain.upsert({
      where: { name: chain.name },
      update: chain,
      create: chain,
    });
    chainMap[chain.chainId] = created.id;
  }

  // Liquidity pools
  for (const pool of LIQUIDITY_POOLS) {
    const chainId = chainMap[pool.chainId];
    if (!chainId) continue;
    // Check by chainId + token
    const existing = await prisma.liquidityPool.findFirst({
      where: { chainId: pool.chainId, token: pool.token }
    });
    if (existing) {
      await prisma.liquidityPool.update({ where: { id: existing.id }, data: pool });
    } else {
      await prisma.liquidityPool.create({ data: pool });
    }
  }

  // Routes — need chain UUIDs
  const eth = chainMap[1];
  const arb = chainMap[42161];
  const base = chainMap[8453];
  const sol = chainMap[101];
  const avax = chainMap[43114];
  const bnb = chainMap[56];

  const ROUTES = [
    { name: "ETH-USDC Arbitrum Express", sourceChainId: eth, destChainId: arb, maxAmount: 10_000_000, minAmount: 100, avgLatency: 8.4, successRate: 99.2, totalVolume: 142_000_000, status: "active" },
    { name: "USDT Base Solana", sourceChainId: base, destChainId: sol, maxAmount: 5_000_000, minAmount: 50, avgLatency: 6.2, successRate: 97.8, totalVolume: 89_000_000, status: "active" },
    { name: "BTC Avalanche Bridge", sourceChainId: eth, destChainId: avax, maxAmount: 2_000_000, minAmount: 200, avgLatency: 14.1, successRate: 95.4, totalVolume: 45_000_000, status: "active" },
    { name: "AVAX BNB Express", sourceChainId: avax, destChainId: bnb, maxAmount: 1_000_000, minAmount: 100, avgLatency: 11.3, successRate: 93.1, totalVolume: 28_000_000, status: "degraded" },
    { name: "ETH Base Express", sourceChainId: eth, destChainId: base, maxAmount: 8_000_000, minAmount: 50, avgLatency: 4.2, successRate: 98.5, totalVolume: 67_000_000, status: "active" },
    { name: "ARB SOL Bridge", sourceChainId: arb, destChainId: sol, maxAmount: 3_000_000, minAmount: 100, avgLatency: 9.8, successRate: 96.1, totalVolume: 34_000_000, status: "active" },
  ];

  for (const route of ROUTES) {
    if (!route.sourceChainId || !route.destChainId) continue;
    const existing = await prisma.route.findFirst({ where: { name: route.name } });
    if (existing) {
      await prisma.route.update({ where: { id: existing.id }, data: route });
    } else {
      await prisma.route.create({ data: route });
    }
  }

  // Alerts
  const alertCount = await prisma.alert.count();
  if (alertCount === 0) {
    for (const alert of ALERTS) {
      await prisma.alert.create({ data: { ...alert, read: false } });
    }
  }

  console.log("Database seeded successfully");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
