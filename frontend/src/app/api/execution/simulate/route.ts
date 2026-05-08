import { NextRequest, NextResponse } from "next/server";
import { ok, badRequest, serverError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { amount, slippageTolerance, bridgePreference, sourceAsset, destinationAsset } = body;

    if (amount != null && (typeof amount !== "number" || amount <= 0)) {
      return badRequest("Amount must be a positive number");
    }

    const result = {
      id: `sim-${Date.now()}`,
      gas: Math.random() * 0.01,
      bridgeFee: (amount as number || 0) * 0.0005,
      slippage: (slippageTolerance as number || 0.5) * 0.001,
      eta: `${(Math.random() * 15 + 2).toFixed(1)}s`,
      confidence: Math.random() * 20 + 78,
      fragments: Math.floor(Math.random() * 3) + 2,
      route: `${sourceAsset || "USDC"} \u2192 ${destinationAsset || "ETH"} via ${bridgePreference || "LayerZero"}`,
      fee: (amount as number || 0) * 0.003,
    };

    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}
