import { NextRequest, NextResponse } from "next/server";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const order = {
    id: generateId(),
    ...body,
    status: "executing",
    txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
    timestamp: Date.now(),
  };

  return NextResponse.json(order);
}
