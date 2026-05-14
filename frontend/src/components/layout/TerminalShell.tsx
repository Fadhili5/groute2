"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { StatusStrip } from "./StatusStrip";
import { useUIStore } from "@/stores";
import { useWebSocket } from "@/hooks/useWebSocket";

export function TerminalShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();
  useWebSocket(process.env.NEXT_PUBLIC_WS_URL);
  const sidebarW = sidebarCollapsed ? 56 : 240;

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />
      <Header />
      <StatusStrip />
      <main
        className="fixed top-header right-0 bottom-status overflow-hidden p-4 transition-all duration-200"
        style={{ left: sidebarW }}
      >
        {children}
      </main>
    </div>
  );
}
