export const dynamic = "force-dynamic";
import { proxyGet } from "@/lib/backend";
export async function GET(_req: Request, { params }: { params: { txHash: string } }) {
  return proxyGet(`/settlement/verify/${params.txHash}`);
}
