"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { StatusStrip } from "./StatusStrip";

export function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />
      <Header />
      <StatusStrip />
      <main className="fixed top-header left-sidebar right-0 bottom-status overflow-hidden p-4">
        {children}
      </main>
    </div>
  );
}
