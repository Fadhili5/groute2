import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { txHash: string } }) {
  return NextResponse.json({
    verified: true,
    txHash: params.txHash,
    block: 19876543,
    confirmations: 32,
    timestamp: Date.now() - 30000,
    state: "confirmed",
    chainId: 1,
  });
}
