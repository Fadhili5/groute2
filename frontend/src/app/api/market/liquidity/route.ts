import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    pools: [
      { chain: "ETH", token: "USDC", depth: 320, apy: 4.2, volume24h: 456 },
      { chain: "ETH", token: "USDT", depth: 280, apy: 3.8, volume24h: 389 },
      { chain: "ETH", token: "ETH", depth: 420, apy: 2.1, volume24h: 234 },
      { chain: "ARB", token: "USDC", depth: 220, apy: 5.8, volume24h: 312 },
      { chain: "ARB", token: "USDT", depth: 180, apy: 5.2, volume24h: 267 },
      { chain: "ARB", token: "ETH", depth: 310, apy: 3.4, volume24h: 189 },
      { chain: "SOL", token: "USDC", depth: 410, apy: 6.9, volume24h: 534 },
      { chain: "SOL", token: "SOL", depth: 380, apy: 5.4, volume24h: 423 },
    ],
  });
}
