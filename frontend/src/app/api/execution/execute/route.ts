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

    const { sourceAsset, destinationAsset, amount } = body;

    if (!sourceAsset || !destinationAsset) {
      return badRequest("sourceAsset and destinationAsset are required");
    }

    if (amount != null && (typeof amount !== "number" || amount <= 0)) {
      return badRequest("Amount must be a positive number");
    }

    const order = {
      id: generateId(),
      ...body,
      status: "executing" as const,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      timestamp: Date.now(),
    };

    return ok(order);
  } catch (error) {
    return serverError(error);
  }
}
