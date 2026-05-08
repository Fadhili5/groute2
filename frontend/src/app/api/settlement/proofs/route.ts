import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    proofs: [
      {
        txHash: "0x7f3c8a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
        routeId: "0x9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
        proofHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
        state: "confirmed",
        fees: 12.45,
        relayer: "0x8f3c7a2b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
        confirmations: 32,
        timestamp: Date.now() - 30000,
      },
      {
        txHash: "0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b",
        routeId: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        proofHash: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
        state: "finalized",
        fees: 8.3,
        relayer: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
        confirmations: 64,
        timestamp: Date.now() - 120000,
      },
    ],
  });
}
