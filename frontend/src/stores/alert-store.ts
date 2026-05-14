import { create } from "zustand";
import type { Alert } from "@/types";

interface AlertState {
  alerts: Alert[];
  loading: boolean;
  addAlert: (alert: Alert) => void;
  markAlertRead: (id: string) => void;
  setAlerts: (alerts: Alert[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  loading: false,
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 100) })),
  markAlertRead: (id) => set((s) => ({ alerts: s.alerts.map((a) => a.id === id ? { ...a, read: true } : a) })),
  setAlerts: (alerts) => set({ alerts }),
  setLoading: (loading) => set({ loading }),
}));
