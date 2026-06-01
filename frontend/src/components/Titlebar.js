import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";

const TITLES = {
  main: "New Job",
  queue: "Queue",
  progress: "Progress",
  result: "Result",
  settings: "Settings",
  logs: "Logs",
};

export const Titlebar = () => {
  const { screen, jobs } = useCigs();
  const running = jobs.filter((j) => j.state === "running").length;
  const pending = jobs.filter((j) => j.state === "pending").length;

  const statusLabel = running
    ? `${running} running`
    : pending
    ? `${pending} queued`
    : "Idle";

  return (
    <header className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-void px-3 select-none">
      <div className="flex items-center gap-3">
        {/* mac traffic lights (cosmetic) */}
        <div className="flex items-center gap-2 pl-0.5">
          <span className="h-3 w-3 rounded-full bg-destructive/80" />
          <span className="h-3 w-3 rounded-full" style={{ background: "hsl(var(--warning))" }} />
          <span className="h-3 w-3 rounded-full bg-primary/80" />
        </div>
        <div className="flex items-baseline gap-2 pl-2">
          <span className="text-[13px] font-bold tracking-tight text-foreground">Cigs</span>
          <span className="text-[11px] text-muted-foreground">— local media utility</span>
        </div>
        <span className="text-border">/</span>
        <span
          data-testid="titlebar-screen-title"
          className="text-[12px] font-medium text-foreground/80"
        >
          {TITLES[screen]}
        </span>
      </div>

      <span
        data-testid="global-status-pill"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
          running
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            running ? "bg-primary cigs-pulse" : "bg-muted-foreground"
          )}
        />
        {statusLabel}
      </span>
    </header>
  );
};
