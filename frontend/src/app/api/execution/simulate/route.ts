import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { amount, slippageTolerance, bridgePreference } = body;

  const result = {
    id: `sim-${Date.now()}`,
    gas: Math.random() * 0.01,
    bridgeFee: (amount || 0) * 0.0005,
    slippage: (slippageTolerance || 0.5) * 0.001,
    eta: `${(Math.random() * 15 + 2).toFixed(1)}s`,
    confidence: Math.random() * 20 + 78,
    fragments: Math.floor(Math.random() * 3) + 2,
    route: `${body.sourceAsset || "USDC"} \u2192 ${body.destinationAsset || "ETH"} via ${bridgePreference || "LayerZero"}`,
    fee: (amount || 0) * 0.003,
  };

  return NextResponse.json(result);
}
