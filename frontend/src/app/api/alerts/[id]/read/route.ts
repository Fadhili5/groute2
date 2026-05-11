export const dynamic = "force-dynamic";
import { proxyPut } from "@/lib/backend";
export async function PUT(_req: Request, { params }: { params: { id: string } }) {
  return proxyPut(`/alerts/${params.id}/read`);
}
