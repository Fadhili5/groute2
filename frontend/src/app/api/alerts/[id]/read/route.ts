import { NextRequest, NextResponse } from "next/server";
import { ok, notFound, serverError } from "@/lib/api-utils";

async function handleRead(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return notFound("Alert ID is required");
    return ok({ success: true, id });
  } catch (error) {
    return serverError(error);
  }
}

export const PUT = handleRead;
export const POST = handleRead;
