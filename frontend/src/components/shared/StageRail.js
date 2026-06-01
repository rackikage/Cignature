import React from "react";
import { cn } from "@/lib/utils";
import { STAGES } from "@/data/seed";
import { Check, X, Search, Download, AudioLines, Captions, Split, Package } from "lucide-react";

const ICONS = [Search, Download, AudioLines, Captions, Split, Package];

// Horizontal staged pipeline. Connectors are static — the only motion is a
// quiet pulse on the active stage icon.
export const StageRail = ({ activeIndex = 0, failed = false, className, compact = false }) => {
  return (
    <div data-testid="progress-stage-list" className={cn("flex w-full items-stretch", className)}>
      {STAGES.map((s, i) => {
        const Icon = ICONS[i];
        const isDone = i < activeIndex;
        const isActive = i === activeIndex && !failed;
        const isFailed = i === activeIndex && failed;
        const isUpcoming = i > activeIndex;
        return (
          <div key={s.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div className={cn("h-px flex-1", i === 0 ? "opacity-0" : isDone || isActive ? "bg-primary/50" : "bg-border")} />
              <div
                data-testid={isActive ? "progress-active-stage" : undefined}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isDone && "border-primary/50 bg-primary/15 text-primary",
                  isActive && "border-primary bg-primary/15 text-primary cigs-elev-1",
                  isFailed && "border-destructive bg-destructive/15 text-destructive",
                  isUpcoming && "border-border bg-muted text-muted-foreground"
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : isFailed ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Icon className={cn("h-4 w-4", isActive && "cigs-pulse")} />
                )}
              </div>
              <div className={cn("h-px flex-1", i === STAGES.length - 1 ? "opacity-0" : isDone || isActive ? "bg-primary/50" : "bg-border")} />
            </div>
            {!compact && (
              <span
                className={cn(
                  "mt-2 text-center text-[11px] leading-tight",
                  isActive && "text-primary font-medium",
                  isFailed && "text-destructive font-medium",
                  isDone && "text-foreground/70",
                  isUpcoming && "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
