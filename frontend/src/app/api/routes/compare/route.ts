export const dynamic = "force-dynamic";
import { proxyPost } from "@/lib/backend";
import { NextRequest } from "next/server";
export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyPost("/routes/compare", body);
}
