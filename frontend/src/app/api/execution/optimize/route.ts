import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = {
    id: `opt-${Date.now()}`,
    optimizedRoute: `${body.sourceChain || "Arbitrum"} \u2192 Arbitrum \u2192 ${body.destinationChain || "Ethereum"}`,
    gas: `${(Math.random() * 5 + 0.1).toFixed(2)} gwei`,
    savings: `${(Math.random() * 30 + 5).toFixed(1)}%`,
    confidence: Math.random() * 10 + 88,
    bridges: ["LayerZero", "Across"],
    fragments: Math.floor(Math.random() * 3) + 1,
    privacyScore: Math.floor(Math.random() * 30) + 65,
  };

  return NextResponse.json(result);
}
