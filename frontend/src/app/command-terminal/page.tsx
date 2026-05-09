"use client";

import { TerminalShell } from "@/components/layout/TerminalShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { CommandTerminal } from "@/components/command-terminal/CommandTerminal";
import { AlertsFeed } from "@/components/alerts-feed/AlertsFeed";

export default function CommandTerminalPage() {
  return (
    <TerminalShell>
      <div className="grid grid-cols-12 gap-2 h-full">
        <div className="col-span-7 min-h-0">
          <ErrorBoundary name="Command Terminal"><CommandTerminal /></ErrorBoundary>
        </div>
        <div className="col-span-5 min-h-0">
          <ErrorBoundary name="Alerts Feed"><AlertsFeed /></ErrorBoundary>
        </div>
      </div>
    </TerminalShell>
  );
}
