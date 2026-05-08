import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    tvl: 847_000_000,
    volume24h: 234_000_000,
    routesExecuted: 1847,
    mevProtected: 98.5,
  });
}
