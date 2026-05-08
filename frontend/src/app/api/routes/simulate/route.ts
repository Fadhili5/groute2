import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    id: `sim-${Date.now()}`,
    status: "completed",
    fragments: [
      { type: "wallet", label: "Source wallet", duration: "0.2s", cost: "$0.00" },
      { type: "split", label: "3 fragments", duration: "0.5s", cost: "$0.01" },
      { type: "bridge", label: "LayerZero \u2192 Arbitrum", duration: "2.1s", cost: "$0.05" },
      { type: "swap", label: "Uniswap V3: USDC \u2192 ETH", duration: "1.8s", cost: "$0.03" },
      { type: "settle", label: "Settlement verification", duration: "0.5s", cost: "$0.01" },
    ],
    totalDuration: "5.1s",
    totalCost: "$0.10",
    confidence: 94.2,
  });
}
