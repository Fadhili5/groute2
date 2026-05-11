"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSolverStore } from "@/stores";
import { Terminal } from "lucide-react";

const WELCOME = `\x1b[36mGhostRoute Terminal v1.0.0\x1b[0m
\x1b[32mConnected: Ethereum | Arbitrum | Base | Solana\x1b[0m
\x1b[33mType 'help' for available commands\x1b[0m
`;

const COMMANDS: Record<string, string> = {
  help: `Available commands:
  route <amount> <asset> <from> <to> [privacy]
  simulate <amount> <asset> <from> <to>
  inspect <txhash>
  watch <mev|routes|alerts>
  compare <asset> <chain1> <chain2>
  status
  clear`,

  status: `Network:      \x1b[32mConnected\x1b[0m
Block:        #19,876,543
Relayers:     12 active
Gas (ETH):    12.4 gwei
Gas (ARB):    0.08 gwei
Memory:       143.2 MB / 512 MB
Uptime:       3d 14h 22m`,
};

export function CommandTerminal() {
  const { terminalOutput, addTerminalOutput, clearTerminal } = useSolverStore();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([WELCOME]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setCmdHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);

    const parts = trimmed.split(/\s+/);
    const main = parts[0].toLowerCase();
    addTerminalOutput(`$ ${trimmed}`);

    let response = "";

    if (main === "clear") {
      setHistory([WELCOME]);
      clearTerminal();
      return;
    }

    if (main === "help") {
      response = COMMANDS.help;
    } else if (main === "status") {
      response = COMMANDS.status;
    } else if (main === "route" && parts.length >= 5) {
      response = `\x1b[36mRoute initialized:\x1b[0m
  Amount:    ${parts[1]} ${parts[2].toUpperCase()}
  Path:      ${parts[3].toUpperCase()} → ${parts[4].toUpperCase()}
  Privacy:   ${parts[5] || "standard"}
  Status:    \x1b[33mSimulating...\x1b[0m
  Route ID:  0x7f3c8a2b...${Math.random().toString(16).slice(2, 6)}`;
    } else if (main === "simulate" && parts.length >= 4) {
      response = `\x1b[36mSimulation result:\x1b[0m
  Amount:    ${parts[1]} ${parts[2].toUpperCase()}
  Path:      ${parts[3].toUpperCase()}
  Gas:       0.0042 ETH
  Bridge:    0.05%
  Slippage:  0.02%
  ETA:       8.4s
  \x1b[32mConfidence: 94.2%\x1b[0m`;
    } else if (main === "inspect" && parts.length >= 2) {
      response = `\x1b[36mInspection result:\x1b[0m
  Hash:      ${parts[1]}
  Status:    \x1b[32mConfirmed\x1b[0m
  Block:     19,876,543
  Gas Used:  142,394
  Fee:       0.0084 ETH`;
    } else if (main === "watch") {
      response = `\x1b[32mWatching ${parts[1] || "all events"}...\x1b[0m
  Monitoring active. Events will appear below.`;
    } else if (main === "compare" && parts.length >= 3) {
      response = `\x1b[36mRoute comparison:\x1b[0m
  ${parts[1].toUpperCase()} on ${parts[2].toUpperCase()}:
    Liquidity:   $842M
    Spread:      0.02%
    Gas:         12.4 gwei
    Latency:     12s
  ${parts[1].toUpperCase()} on ${parts[3]?.toUpperCase() || "N/A"}:
    \x1b[33mInsufficient data\x1b[0m`;
    } else {
      response = `\x1b[31mUnknown command: ${main}\x1b[0m
  Type 'help' for available commands`;
    }

    setHistory((prev) => [...prev, `\x1b[32m$\x1b[0m ${trimmed}`, response]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx >= 0) {
        const newIdx = historyIdx + 1;
        if (newIdx >= cmdHistory.length) {
          setHistoryIdx(-1);
          setInput("");
        } else {
          setHistoryIdx(newIdx);
          setInput(cmdHistory[newIdx]);
        }
      }
    }
  };

  const renderLine = (line: string, i: number) => {
    const parts = line.split(/(\x1b\[[0-9;]*m)/g);
    const colorMap: Record<string, string> = {
      "32": "text-matrix-green",
      "31": "text-matrix-red",
      "33": "text-matrix-yellow",
      "36": "text-matrix-accent",
      "0": "text-surface-300",
    };
    const elements: React.ReactNode[] = [];
    let currentColor = "text-surface-300";
    parts.forEach((part, j) => {
      if (part.startsWith("\x1b[")) {
        const code = part.slice(2, -1);
        currentColor = colorMap[code] || "text-surface-300";
      } else if (part) {
        elements.push(<span key={j} className={currentColor}>{part}</span>);
      }
    });
    return (
      <div key={i} className="whitespace-pre-wrap break-all">
        {elements}
      </div>
    );
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex-shrink-0">
        <span className="panel-title">Command Terminal</span>
        <Terminal className="w-3 h-3 text-surface-500" />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 p-2 overflow-y-auto font-mono text-2xs leading-relaxed bg-terminal-bg cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, i) => renderLine(line, i))}

        <div className="flex items-center gap-1">
          <span className="text-matrix-green">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-surface-300 font-mono text-2xs"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
