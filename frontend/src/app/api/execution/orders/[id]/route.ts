export const dynamic = "force-dynamic";
import { proxyGet } from "@/lib/backend";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return proxyGet(`/execution/orders/${params.id}`);
}
