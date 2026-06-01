import React from "react";
import { cn } from "@/lib/utils";
import { BRANCHES } from "@/data/seed";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AudioLines, Video, Layers, Crosshair } from "lucide-react";

const ICONS = { Audio: AudioLines, Complete: Layers, Video: Video };

// Compact circular branch selector. Kept as Cigs' visual signature but
// deliberately small and quiet — it's an accent, not the primary control.
export const CircularHub = ({ value, onSelect }) => {
  const size = 168;
  const radius = 62;
  const center = size / 2;
  const ActiveIcon = value ? ICONS[value] : Crosshair;

  return (
    <div
      data-testid="job-builder-hub"
      className="relative cigs-noise"
      style={{ width: size, height: size }}
    >
      {/* grid backdrop */}
      <div className="absolute inset-0 cigs-grid rounded-full" />
      {/* ring */}
      <div className="absolute rounded-full border border-border/70" style={{ inset: 22 }} />

      {/* center core (static — no scanline) */}
      <div
        className={cn(
          "absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-center transition-colors",
          value
            ? "border-primary/60 bg-primary/5 text-primary cigs-elev-1"
            : "border-border bg-card text-muted-foreground"
        )}
      >
        <ActiveIcon className="h-5 w-5" />
        <span className="mt-0.5 px-1 text-[9px] font-medium leading-tight">
          {value ? value : "Branch"}
        </span>
      </div>

      {/* branch nodes */}
      {BRANCHES.map((b, i) => {
        const angle = (-90 + i * (360 / BRANCHES.length)) * (Math.PI / 180);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const Icon = ICONS[b.key];
        const active = value === b.key;
        return (
          <Tooltip key={b.key} delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                data-testid={`hub-branch-${b.key.toLowerCase()}`}
                onClick={() => onSelect(b.key)}
                className={cn(
                  "absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all",
                  active
                    ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/40 cigs-elev-1"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
                style={{ left: x, top: y }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-center">
              <span className="font-semibold">{b.key}</span>
              <span className="block text-[10px] text-muted-foreground">{b.sub}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
