"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AlertsFeed } from "@/components/alerts-feed/AlertsFeed";
import { Watchlist } from "@/components/watchlist/Watchlist";

export default function AlertsPage() {
  return (
    <TerminalShell>
      <div className="grid grid-cols-12 gap-2 h-full">
        <div className="col-span-7 min-h-0">
          <ErrorBoundary name="Alerts Feed"><AlertsFeed /></ErrorBoundary>
        </div>
        <div className="col-span-5 min-h-0">
          <ErrorBoundary name="Watchlist"><Watchlist /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
