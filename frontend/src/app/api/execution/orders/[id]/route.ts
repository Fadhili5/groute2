import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({
    id: params.id,
    status: "completed",
    sourceAsset: "USDC",
    destinationAsset: "ETH",
    amount: 50000,
    timestamp: Date.now() - 300000,
    txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
  });
}
