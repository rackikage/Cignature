import React from "react";
import { useCigs } from "@/context/CigsContext";

// Slim desktop status bar. Carries the discreet "demo only" disclosure on the
// left and ambient counts + keyboard hints on the right.
const Kbd = ({ children }) => (
  <kbd className="mono rounded border border-border bg-surface-2 px-1 py-px text-[10px] text-muted-foreground">
    {children}
  </kbd>
);

export const StatusBar = () => {
  const { jobs, screen } = useCigs();
  const running = jobs.filter((j) => j.state === "running").length;

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-void px-3 text-[11px] text-muted-foreground select-none">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        <span data-testid="demo-mode-hint">Preview build — jobs are simulated, nothing on disk is touched.</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="mono tabular">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""}
          {running ? ` · ${running} running` : ""}
        </span>
        {screen === "main" && (
          <span className="hidden items-center gap-1.5 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
            <span>Start</span>
            <span className="text-border">·</span>
            <Kbd>⌘</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>↵</Kbd>
            <span>Queue</span>
          </span>
        )}
      </div>
    </footer>
  );
};
