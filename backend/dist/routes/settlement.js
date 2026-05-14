import { z } from "zod";
import { v4 as uuid } from "uuid";
const inspectSchema = z.object({
    txHash: z.string().optional(),
    routeId: z.string().optional(),
});
const PROOFS = [
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
        fees: 8.30,
        relayer: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
        confirmations: 64,
        timestamp: Date.now() - 120000,
    },
];
export async function settlementRoutes(app, opts) {
    app.get("/proofs", async () => {
        if (!opts.prisma)
            return { proofs: PROOFS };
        const settlements = await opts.prisma.settlement.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        if (!settlements.length)
            return { proofs: PROOFS };
        return {
            proofs: settlements.map((s) => ({
                txHash: s.txHash,
                routeId: s.routeId,
                proofHash: s.proofHash,
                state: s.state,
                fees: s.fee,
                relayer: s.relayerAddress,
                confirmations: s.confirmations,
                timestamp: s.createdAt.getTime(),
            })),
        };
    });
    app.get("/verify/:txHash", async (request, reply) => {
        const { txHash } = request.params;
        if (!opts.prisma) {
            const proof = PROOFS.find((p) => p.txHash === txHash);
            if (!proof) {
                return reply.status(404).send({ error: { code: "PROOF_NOT_FOUND", message: "Transaction proof not found" } });
            }
            return {
                verified: proof.state !== "failed",
                txHash,
                block: 19876543,
                confirmations: proof.confirmations,
                timestamp: proof.timestamp,
                state: proof.state,
                chainId: 1,
            };
        }
        const settlement = await opts.prisma.settlement.findUnique({ where: { txHash } });
        if (!settlement) {
            return reply.status(404).send({ error: { code: "PROOF_NOT_FOUND", message: "Transaction proof not found" } });
        }
        return {
            verified: settlement.state !== "pending",
            txHash,
            block: 19876543,
            confirmations: settlement.confirmations,
            timestamp: settlement.createdAt.getTime(),
            state: settlement.state,
            chainId: 1,
        };
    });
    app.post("/inspect", async (request, reply) => {
        const data = inspectSchema.parse(request.body);
        const result = {
            txHash: data.txHash || `0x${uuid().replace(/-/g, "")}`,
            routeId: data.routeId || uuid(),
            proofHash: `0x${uuid().replace(/-/g, "")}`,
            state: "confirmed",
            fees: parseFloat((Math.random() * 20 + 5).toFixed(2)),
            relayer: `0x${uuid().replace(/-/g, "").slice(0, 40)}`,
            confirmations: Math.floor(Math.random() * 64) + 1,
            timestamp: Date.now(),
        };
        return result;
    });
}
//# sourceMappingURL=settlement.js.map