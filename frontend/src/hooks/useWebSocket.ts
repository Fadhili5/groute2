"use client";

import { useEffect, useRef } from "react";
import { useMarketStore, useAlertStore, useWalletStore } from "@/stores";
import { api } from "@/lib/api-client";

interface WSMessage {
  type: "chain_update" | "market_update" | "alert" | "price_update" | "kpi_update" | "block_update" | "execution_update" | "settlement_update";
  data: any;
}

export function useWebSocket(url?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  const { setChains } = useMarketStore();
  const { addAlert } = useAlertStore();
  const { setKpis, setSystemHealth } = useWalletStore();

  const loadInitialData = async () => {
    try {
      const [chainsRes, kpiRes, healthRes] = await Promise.all([
        api.getChains().catch(() => null),
        api.getKpi().catch(() => null),
        api.getSystemHealth().catch(() => null),
      ]);
      if (chainsRes?.chains) setChains(chainsRes.chains);
      if (kpiRes) setKpis(kpiRes);
      if (healthRes) setSystemHealth(healthRes);
    } catch { /* initial load failed, will retry via reconnection */ }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadInitialData();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!url) return;

    const connect = () => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          retryCountRef.current = 0;
          loadInitialData();
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const msg: WSMessage = JSON.parse(event.data);
            switch (msg.type) {
              case "chain_update":
                setChains(msg.data);
                break;
              case "market_update": {
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
          if (mountedRef.current) {
            retryCountRef.current++;
            const delay = Math.min(5000 * Math.pow(2, retryCountRef.current), 30000);
            reconnectRef.current = setTimeout(connect, delay);
          }
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
