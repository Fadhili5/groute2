import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    network: "connected",
    relayers: 12,
    blockHeight: 19876543,
    apiHealth: "healthy",
  });
}
