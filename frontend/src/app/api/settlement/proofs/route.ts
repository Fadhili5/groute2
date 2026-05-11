export const dynamic = "force-dynamic";
import { proxyGet } from "@/lib/backend";
export async function GET() { return proxyGet("/settlement/proofs"); }
