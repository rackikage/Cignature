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
// the motion, every bit transform/opacity only:
//   · idle drift  — the conic ring rotates slowly (CSS `animate-hub-drift`)
//   · cursor      — rAF-damped tilt + layer parallax + a follow-glow that
//                   tracks the pointer (useHudPointer)
//   · snap        — the active arc rotates to the selected branch (.5s ease)
// Depth comes from a blurred ring underglow, an inner vignette, and elevation —
// so it reads as a lit instrument, not a flat sticker. Cursor motion is fully
// disabled under reduced-motion; snap + interaction remain.
export const Hud = ({ value, onSelect, runningJob, hint }) => {
  const stageRef = useHudPointer(9);
  const selectedIndex = value ? BRANCHES.findIndex((b) => b.key === value) : -1;
  const arcAngle = selectedIndex >= 0 ? selectedIndex * STEP : 0;
  const CoreIcon = value ? ICONS[value] : Crosshair;
  const pct = runningJob ? Math.round(runningJob.progress) : 0;

  return (
    <div
      ref={stageRef}
      data-testid="job-builder-hub"
      className="hud-stage relative mx-auto aspect-square w-full max-w-[360px] select-none"
      style={{ "--hud-rx": "0deg", "--hud-ry": "0deg", "--hud-mx": 0, "--hud-my": 0, "--hud-gx": "50%", "--hud-gy": "50%" }}
    >
      <div
        className="hud-tilt absolute inset-0"
        style={{
          transform:
            "perspective(820px) rotateX(var(--hud-ry)) rotateY(var(--hud-rx))",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* cursor follow-glow — tracks the pointer, gives the surface life + depth */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at var(--hud-gx) var(--hud-gy), hsl(259 89% 72% / 0.20), hsl(327 95% 70% / 0.08) 38%, transparent 62%)",
            pointerEvents: "none",
          }}
        />

        {/* faint radial grid backdrop */}
        <div className="cigs-grid absolute inset-[12%] rounded-full opacity-50" />

        {/* blurred ring underglow — makes the ring emit light rather than sit flat */}
        <div
          className="animate-hub-drift absolute inset-[2%] rounded-full"
          style={{
            background: "var(--grad-hub)",
            filter: "blur(15px)",
            opacity: 0.55,
            WebkitMaskImage: ringMask,
            maskImage: ringMask,
            willChange: "transform",
            pointerEvents: "none",
          }}
        />

        {/* drifting conic ring (sharp) */}
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
              "repeating-conic-gradient(from 0deg, hsl(233 18% 52%) 0deg 0.4deg, transparent 0.4deg 15deg)",
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
              "conic-gradient(from -28deg, hsl(var(--primary) / 0) 0deg, hsl(var(--primary) / 0.65) 28deg, hsl(var(--primary) / 0) 56deg)",
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

        {/* inner vignette — depth so the disc isn't a flat cutout */}
        <div
          className="absolute inset-[18%] rounded-full"
          style={{
            boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.05), inset 0 -22px 40px -16px hsl(231 45% 2% / 0.9)",
            pointerEvents: "none",
          }}
        />

        {/* center core — context-aware focal point, parallaxes with the cursor */}
        <div
          data-testid="hud-core"
          className={cn(
            "absolute left-1/2 top-1/2 flex h-[31%] w-[31%] items-center justify-center rounded-full border cigs-elev-2 transition-colors",
            runningJob ? "border-live/50" : value ? "border-primary/60" : "border-border"
          )}
          style={{
            transform:
              "translate(-50%, -50%) translate3d(calc(var(--hud-mx, 0) * 9px), calc(var(--hud-my, 0) * 9px), 0)",
            ...(runningJob
              ? { backgroundImage: `conic-gradient(hsl(var(--live)) ${pct}%, hsl(var(--muted)) ${pct}% 100%)` }
              : { backgroundColor: "hsl(var(--card))" }),
          }}
        >
          <div className="absolute inset-[3px] flex flex-col items-center justify-center rounded-full bg-card px-2 text-center">
            {runningJob ? (
              <>
                <span className="mono text-[16px] font-bold tabular text-foreground">{pct}%</span>
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
                    value ? "text-foreground" : "text-foreground/80"
                  )}
                >
                  {value || "Pick a branch"}
                </span>
                {hint && (
                  <span className="mt-0.5 text-[8.5px] leading-tight text-muted-foreground">{hint}</span>
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
                    "absolute flex h-[15.5%] w-[15.5%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border cigs-elev-1 transition-all duration-300",
                    active
                      ? "scale-110 border-primary bg-primary/20 text-primary ring-2 ring-primary/50"
                      : "border-border bg-card text-muted-foreground hover:scale-105 hover:border-primary/60 hover:text-foreground"
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
