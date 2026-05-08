import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    items: [
      { type: "chain", message: "ETH: block 19876543 | gas 12.4 gwei", severity: "info" },
      { type: "chain", message: "ARB: block 187654321 | gas 0.08 gwei", severity: "info" },
      { type: "route", message: "Route 0x7f3c completed: 50000 USDC ARB \u2192 ETH (12.4s)", severity: "info" },
      { type: "alert", message: "MEV protection engaged on Ethereum mempool", severity: "warning" },
      { type: "bridge", message: "LayerZero: 3 active relays | 0 pending", severity: "info" },
      { type: "gas", message: "Base gas spike: 3.2 gwei (+240%)", severity: "warning" },
    ],
  });
}
