import { NextResponse } from "next/server";

const ALERTS = [
  { id: "a1", type: "route_success", severity: "info", message: "Route 0x7f3c: 50,000 USDC ARB \u2192 ETH completed in 12.4s", timestamp: Date.now() - 5000, read: false },
  { id: "a2", type: "mev_event", severity: "warning", message: "MEV bot detected on Ethereum mempool - protection engaged", timestamp: Date.now() - 15000, read: false, chain: "ethereum" },
  { id: "a3", type: "bridge_outage", severity: "critical", message: "Wormhole: 4 relayers delayed on Avalanche path", timestamp: Date.now() - 30000, read: false, chain: "avalanche" },
  { id: "a4", type: "gas_spike", severity: "warning", message: "Base gas spike: 3.2 gwei (+240% in 5 min)", timestamp: Date.now() - 60000, read: false, chain: "base" },
  { id: "a5", type: "liquidity_spike", severity: "info", message: "Uniswap V3 ETH/USDC pool: +$42M depth added", timestamp: Date.now() - 120000, read: true, chain: "ethereum" },
  { id: "a6", type: "relayer_failure", severity: "warning", message: "Relayer node 0x8f3c missed 3 consecutive attestations", timestamp: Date.now() - 240000, read: true },
];

export async function GET() {
  return NextResponse.json({ alerts: ALERTS });
}
