import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    routes: [
      { id: "r1", name: "ETH-USDC Arbitrum Express", sourceChain: "Ethereum", destChain: "Arbitrum", avgLatency: 8.4, successRate: 99.2, totalVolume: 142000000, status: "active" },
      { id: "r2", name: "USDT Base Solana", sourceChain: "Base", destChain: "Solana", avgLatency: 6.2, successRate: 97.8, totalVolume: 89000000, status: "active" },
      { id: "r3", name: "BTC Avalanche Bridge", sourceChain: "Ethereum", destChain: "Avalanche", avgLatency: 14.1, successRate: 95.4, totalVolume: 45000000, status: "active" },
      { id: "r4", name: "AVAX BNB Express", sourceChain: "Avalanche", destChain: "BNB Chain", avgLatency: 11.3, successRate: 93.1, totalVolume: 28000000, status: "degraded" },
    ],
  });
}
