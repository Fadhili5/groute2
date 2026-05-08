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

    const { sourceChain, destinationChain } = body;

    const result = {
      id: `opt-${Date.now()}`,
      optimizedRoute: `${sourceChain || "Arbitrum"} \u2192 Arbitrum \u2192 ${destinationChain || "Ethereum"}`,
      gas: `${(Math.random() * 5 + 0.1).toFixed(2)} gwei`,
      savings: `${(Math.random() * 30 + 5).toFixed(1)}%`,
      confidence: Math.random() * 10 + 88,
      bridges: ["LayerZero", "Across"],
      fragments: Math.floor(Math.random() * 3) + 1,
      privacyScore: Math.floor(Math.random() * 30) + 65,
    };

    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}
