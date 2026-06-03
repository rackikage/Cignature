import React from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useCigs } from "@/context/CigsContext";

// Slim desktop status bar. Native shell: "Local engine ready" + counts.
// Browser preview: keeps the honest "preview build" disclosure.
const Kbd = ({ children }) => (
  <kbd className="mono rounded border border-border bg-surface-2 px-1 py-px text-[10px] text-muted-foreground">
    {children}
  </kbd>
);

const nativeShell = () => {
  try {
    return isTauri();
  } catch {
    return false;
  }
};

export const StatusBar = () => {
  const { jobs, screen } = useCigs();
  const running = jobs.filter((j) => j.state === "running").length;
  const native = nativeShell();

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-void px-3 text-[11px] text-muted-foreground select-none">
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${native ? "bg-success" : "bg-warning"}`}
        />
        <span data-testid="demo-mode-hint">
          {native ? "Local engine ready." : "Preview build — jobs are simulated."}
        </span>
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
