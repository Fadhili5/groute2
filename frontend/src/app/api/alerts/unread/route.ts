import { NextResponse } from "next/server";

const ALERTS = [
  { id: "a1", type: "route_success", severity: "info", message: "Route 0x7f3c: 50,000 USDC ARB \u2192 ETH completed", timestamp: Date.now() - 5000, read: false },
  { id: "a2", type: "mev_event", severity: "warning", message: "MEV bot detected on Ethereum mempool", timestamp: Date.now() - 15000, read: false },
  { id: "a3", type: "bridge_outage", severity: "critical", message: "Wormhole: 4 relayers delayed on Avalanche path", timestamp: Date.now() - 30000, read: false },
];

export async function GET() {
  return NextResponse.json({
    unread: ALERTS.filter((a) => !a.read).length,
    alerts: ALERTS.filter((a) => !a.read),
  });
}
