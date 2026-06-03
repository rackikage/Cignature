import React from "react";
import { cn } from "@/lib/utils";

const MAP = {
  running: {
    label: "Running",
    cls: "border-live/40 text-live bg-live/10",
    dot: "bg-live",
    pulse: true,
  },
  completed: {
    label: "Completed",
    cls: "border-success/30 text-success bg-success/10",
    dot: "bg-success",
  },
  pending: {
    label: "Pending",
    cls: "border-border text-muted-foreground bg-muted",
    dot: "bg-muted-foreground",
  },
  failed: {
    label: "Failed",
    cls: "border-destructive/40 text-destructive bg-destructive/10",
    dot: "bg-destructive",
  },
};

export const StatusPill = ({ state, className }) => {
  const cfg = MAP[state] || MAP.pending;
  return (
    <span
      data-testid="job-state-pill"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        cfg.cls,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot, cfg.pulse && "cigs-pulse")} />
      {cfg.label}
    </span>
  );
};
