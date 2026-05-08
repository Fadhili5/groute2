import { NextRequest, NextResponse } from "next/server";
import { ok, badRequest, serverError } from "@/lib/api-utils";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { txHash, routeId } = body;

    return ok({
      txHash: txHash || `0x${generateId().replace(/-/g, "")}`,
      routeId: routeId || generateId(),
      proofHash: `0x${generateId().replace(/-/g, "").slice(0, 64)}`,
      state: "confirmed",
      fees: Math.random() * 20 + 5,
      relayer: `0x${generateId().replace(/-/g, "").slice(0, 40)}`,
      confirmations: Math.floor(Math.random() * 64) + 1,
      timestamp: Date.now(),
    });
  } catch (error) {
    return serverError(error);
  }
}
