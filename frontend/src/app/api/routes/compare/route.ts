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

    const { asset, chain1, chain2 } = body;

    if (!chain1 && !chain2) {
      return badRequest("At least one chain is required");
    }

    return ok({
      comparison: [
        { chain: chain1 || "Ethereum", liquidity: "$842M", spread: "0.02%", gas: "12.4 gwei", latency: "12s", score: 92 },
        { chain: chain2 || "Arbitrum", liquidity: "$456M", spread: "0.03%", gas: "0.08 gwei", latency: "3s", score: 88 },
      ],
      recommendation: chain2 || "Arbitrum",
      reason: "Lower gas costs and faster finality outweigh slightly lower liquidity depth.",
    });
  } catch (error) {
    return serverError(error);
  }
}
