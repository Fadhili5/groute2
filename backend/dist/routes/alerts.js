import { z } from "zod";
const createAlertSchema = z.object({
    type: z.enum(["bridge_outage", "route_success", "mev_event", "liquidity_spike", "relayer_failure", "gas_spike"]),
    severity: z.enum(["info", "warning", "critical"]),
    message: z.string().min(1).max(500),
    chainId: z.string().optional(),
});
const DEFAULT_ALERTS = [
    { id: "1", type: "route_success", severity: "info", message: "Route 0x7f3c: 50,000 USDC ARB → ETH completed in 12.4s", read: false, timestamp: Date.now() - 60000 },
    { id: "2", type: "mev_event", severity: "warning", message: "MEV bot detected on Ethereum mempool — protection engaged", chain: "ethereum", read: false, timestamp: Date.now() - 120000 },
    { id: "3", type: "bridge_outage", severity: "critical", message: "Wormhole: 4 relayers delayed on Avalanche path", chain: "avalanche", read: false, timestamp: Date.now() - 180000 },
];
export async function alertRoutes(app, opts) {
    app.get("/", async () => {
        if (!opts.prisma)
            return { alerts: DEFAULT_ALERTS };
        const alerts = await opts.prisma.alert.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        if (!alerts.length)
            return { alerts: DEFAULT_ALERTS };
        return {
            alerts: alerts.map((a) => ({ ...a, timestamp: a.createdAt.getTime() })),
        };
    });
    app.get("/unread", async () => {
        if (!opts.prisma) {
            const unread = DEFAULT_ALERTS.filter((a) => !a.read);
            return { unread: unread.length, alerts: unread };
        }
        const alerts = await opts.prisma.alert.findMany({
            where: { read: false },
            orderBy: { createdAt: "desc" },
        });
        return {
            unread: alerts.length,
            alerts: alerts.map((a) => ({ ...a, timestamp: a.createdAt.getTime() })),
        };
    });
    app.put("/:id/read", async (request, reply) => {
        const { id } = request.params;
        if (!opts.prisma) {
            const alert = DEFAULT_ALERTS.find((a) => a.id === id);
            if (!alert)
                return reply.status(404).send({ error: { code: "ALERT_NOT_FOUND", message: "Alert not found" } });
            alert.read = true;
            return { success: true };
        }
        try {
            await opts.prisma.alert.update({ where: { id }, data: { read: true } });
            return { success: true };
        }
        catch {
            return reply.status(404).send({ error: { code: "ALERT_NOT_FOUND", message: "Alert not found" } });
        }
    });
    app.post("/", async (request, reply) => {
        const data = createAlertSchema.parse(request.body);
        if (!opts.prisma) {
            return { id: `alert-${Date.now()}`, ...data, read: false, timestamp: Date.now() };
        }
        const alert = await opts.prisma.alert.create({
            data: { type: data.type, severity: data.severity, message: data.message, chainId: data.chainId },
        });
        return { ...alert, timestamp: alert.createdAt.getTime() };
    });
}
//# sourceMappingURL=alerts.js.map