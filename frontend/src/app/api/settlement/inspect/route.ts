import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { txHash, routeId } = body;

  return NextResponse.json({
    txHash: txHash || `0x${Date.now().toString(16)}`,
    routeId: routeId || `${Date.now()}`,
    proofHash: `0x${Math.random().toString(16).slice(2, 66)}`,
    state: "confirmed",
    fees: Math.random() * 20 + 5,
    relayer: `0x${Math.random().toString(16).slice(2, 42)}`,
    confirmations: Math.floor(Math.random() * 64) + 1,
    timestamp: Date.now(),
  });
}
