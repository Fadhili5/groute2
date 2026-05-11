"use client";

import { useEffect, useRef } from "react";
import { useMarketStore, useAlertStore, useWalletStore } from "@/stores";

interface WSMessage {
  type: "chain_update" | "market_update" | "alert" | "price_update" | "kpi_update" | "block_update" | "execution_update" | "settlement_update";
  data: any;
}

export function useWebSocket(url?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  const { setChains } = useMarketStore();
  const { addAlert } = useAlertStore();
  const { setKpis, setSystemHealth } = useWalletStore();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!url) {
      const simulationInterval = setInterval(() => {
        if (!mountedRef.current) return;
        useMarketStore.getState().chains.length > 0 && useMarketStore.setState((s) => ({
          chains: s.chains.map((c) => ({ ...c, gas: +(c.gas * (0.98 + Math.random() * 0.04)).toFixed(4) }))
        }));
        const alertTypes = ["route_success", "mev_event", "gas_spike"] as const;
        if (Math.random() > 0.7) {
          const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
          useAlertStore.getState().addAlert({
            id: `ws-${Date.now()}`,
            type,
            severity: type === "route_success" ? "info" : "warning",
            message: type === "route_success" ? `Route 0x${Math.random().toString(16).slice(2, 6)} completed` : type === "mev_event" ? "MEV activity detected" : "Gas price fluctuation",
            timestamp: Date.now(),
            read: false,
          });
        }
      }, 8000);
      return () => clearInterval(simulationInterval);
    }

    const connect = () => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const msg: WSMessage = JSON.parse(event.data);
            switch (msg.type) {
              case "chain_update":
                setChains(msg.data);
                break;
              case "market_update": {
                // backend sends single chain delta: { chain, gas, liquidity, spread }
                const current = useMarketStore.getState().chains;
                const updated = current.map((c) =>
                  c.name === msg.data.chain
                    ? { ...c, gas: parseFloat(msg.data.gas) || c.gas, liquidity: msg.data.liquidity || c.liquidity }
                    : c
                );
                setChains(updated);
                break;
              }
              case "alert":
                addAlert({ ...msg.data, id: msg.data.id ?? `ws-${Date.now()}`, read: false, timestamp: msg.data.timestamp ?? Date.now() });
                break;
              case "kpi_update":
                setKpis(msg.data);
                break;
              case "block_update":
                setSystemHealth({ ...useWalletStore.getState().systemHealth, blockHeight: msg.data });
                break;
            }
          } catch { /* ignore parse errors */ }
        };

        ws.onclose = () => {
          if (mountedRef.current) reconnectRef.current = setTimeout(connect, 5000);
        };

        ws.onerror = () => ws.close();
      } catch { /* ignore connection errors */ }
    };

    connect();

    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [url, setChains, addAlert, setKpis, setSystemHealth]);
}
