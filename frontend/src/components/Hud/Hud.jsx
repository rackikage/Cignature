import React from "react";
import { cn } from "@/lib/utils";
import { BRANCHES } from "@/data/seed";
import { useHudPointer } from "@/components/Hud/useHudPointer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AudioLines, Layers, Video, Crosshair } from "lucide-react";

const ICONS = { Audio: AudioLines, Complete: Layers, Video: Video };

// Branch nodes sit at fixed angles measured clockwise from the top
// (Audio = top, Complete = lower-right, Video = lower-left).
const STEP = 360 / BRANCHES.length;
const nodePos = (i) => {
  const rad = (i * STEP * Math.PI) / 180;
  return { x: Math.sin(rad), y: -Math.cos(rad) };
};

const ringMask =
  "radial-gradient(closest-side, transparent 63%, #000 66%, #000 97%, transparent 100%)";

// Radial command HUD — the one high-energy surface in the app. It carries all
// three motions, every one transform/opacity only:
//   · idle drift  — the conic ring rotates slowly (CSS `animate-hub-drift`)
//   · cursor tilt — rAF-damped ±6° perspective parallax (useHudPointer)
//   · snap        — the active arc rotates to the selected branch (.5s ease)
// Drift + tilt are disabled under reduced-motion; snap + interaction remain.
export const Hud = ({ value, onSelect, runningJob, hint }) => {
  const stageRef = useHudPointer(6);
  const selectedIndex = value ? BRANCHES.findIndex((b) => b.key === value) : -1;
  const arcAngle = selectedIndex >= 0 ? selectedIndex * STEP : 0;
  const CoreIcon = value ? ICONS[value] : Crosshair;
  const pct = runningJob ? Math.round(runningJob.progress) : 0;

  return (
    <div
      ref={stageRef}
      data-testid="job-builder-hub"
      className="hud-stage relative mx-auto aspect-square w-full max-w-[360px] select-none"
      style={{ "--hud-rx": "0deg", "--hud-ry": "0deg" }}
    >
      <div
        className="hud-tilt absolute inset-0"
        style={{
          transform:
            "perspective(900px) rotateX(var(--hud-ry)) rotateY(var(--hud-rx))",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* faint radial grid backdrop */}
        <div className="cigs-grid absolute inset-[12%] rounded-full opacity-60" />

        {/* drifting conic ring */}
        <div
          className="hud-ring animate-hub-drift absolute inset-0 rounded-full"
          style={{
            background: "var(--grad-hub)",
            WebkitMaskImage: ringMask,
            maskImage: ringMask,
            willChange: "transform",
            pointerEvents: "none",
          }}
        />

        {/* static tick dial — a fixed reference against the drifting ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "repeating-conic-gradient(from 0deg, hsl(var(--border)) 0deg 0.35deg, transparent 0.35deg 15deg)",
            WebkitMaskImage:
              "radial-gradient(closest-side, transparent 80%, #000 82%, #000 88%, transparent 90%)",
            maskImage:
              "radial-gradient(closest-side, transparent 80%, #000 82%, #000 88%, transparent 90%)",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        />

        {/* active arc — snaps to the selected branch angle */}
        <div
          className="hud-arc absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from -28deg, hsl(var(--primary) / 0) 0deg, hsl(var(--primary) / 0.55) 28deg, hsl(var(--primary) / 0) 56deg)",
            WebkitMaskImage:
              "radial-gradient(closest-side, transparent 60%, #000 64%, #000 99%, transparent 100%)",
            maskImage:
              "radial-gradient(closest-side, transparent 60%, #000 64%, #000 99%, transparent 100%)",
            transform: `rotate(${arcAngle}deg)`,
            transition: "transform .5s cubic-bezier(.2,.8,.2,1), opacity .3s ease",
            opacity: selectedIndex >= 0 ? 1 : 0,
            willChange: "transform",
            pointerEvents: "none",
          }}
        />

        {/* center core — context-aware focal point */}
        <div
          data-testid="hud-core"
          className={cn(
            "absolute left-1/2 top-1/2 flex h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-colors",
            runningJob
              ? "border-live/50 cigs-elev-1"
              : value
              ? "border-primary/55 cigs-elev-1"
              : "border-border"
          )}
          style={
            runningJob
              ? {
                  backgroundImage: `conic-gradient(hsl(var(--live)) ${pct}%, hsl(var(--muted)) ${pct}% 100%)`,
                }
              : { backgroundColor: "hsl(var(--card))" }
          }
        >
          <div className="absolute inset-[3px] flex flex-col items-center justify-center rounded-full bg-card px-2 text-center">
            {runningJob ? (
              <>
                <span className="mono text-[15px] font-bold tabular text-foreground">{pct}%</span>
                <span className="w-full truncate text-[9px] font-medium leading-tight text-muted-foreground">
                  {runningJob.title}
                </span>
              </>
            ) : (
              <>
                <CoreIcon className={cn("h-5 w-5", value ? "text-primary" : "text-muted-foreground")} />
                <span
                  className={cn(
                    "mt-0.5 text-[10px] font-semibold leading-tight",
                    value ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {value || "Pick a branch"}
                </span>
                {hint && (
                  <span className="mt-0.5 text-[8.5px] leading-tight text-muted-foreground/70">{hint}</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* branch nodes — fixed angles, upright, clickable; never rotate on snap */}
        {BRANCHES.map((b, i) => {
          const { x, y } = nodePos(i);
          const Icon = ICONS[b.key];
          const active = value === b.key;
          return (
            <Tooltip key={b.key} delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  data-testid={`hub-branch-${b.key.toLowerCase()}`}
                  onClick={() => onSelect(b.key)}
                  style={{ left: `${50 + x * 38}%`, top: `${50 + y * 38}%` }}
                  className={cn(
                    "absolute flex h-[15%] w-[15%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-300",
                    active
                      ? "scale-110 border-primary bg-primary/15 text-primary ring-2 ring-primary/40 cigs-elev-1"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
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
    </div>
  );
};
