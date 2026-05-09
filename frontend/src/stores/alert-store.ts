import { create } from "zustand";
import type { Alert } from "@/types";

interface AlertState {
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  markAlertRead: (id: string) => void;
  setAlerts: (alerts: Alert[]) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 100) })),
  markAlertRead: (id) => set((s) => ({ alerts: s.alerts.map((a) => a.id === id ? { ...a, read: true } : a) })),
  setAlerts: (alerts) => set({ alerts }),
}));
