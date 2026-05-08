import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ success: true, id: params.id });
}
