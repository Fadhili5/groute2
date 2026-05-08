import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { asset, chain1, chain2 } = body;

  return NextResponse.json({
    comparison: [
      { chain: chain1 || "Ethereum", liquidity: "$842M", spread: "0.02%", gas: "12.4 gwei", latency: "12s", score: 92 },
      { chain: chain2 || "Arbitrum", liquidity: "$456M", spread: "0.03%", gas: "0.08 gwei", latency: "3s", score: 88 },
    ],
    recommendation: chain2 || "Arbitrum",
    reason: "Lower gas costs and faster finality outweigh slightly lower liquidity depth.",
  });
}
