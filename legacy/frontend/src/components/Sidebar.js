import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Crosshair,
  ListChecks,
  Activity,
  PackageCheck,
  Settings2,
  Terminal,
} from "lucide-react";

const NAV = [
  { key: "main", label: "Main", icon: Crosshair, testid: "nav-main" },
  { key: "queue", label: "Queue", icon: ListChecks, testid: "nav-queue" },
  { key: "progress", label: "Progress", icon: Activity, testid: "nav-progress" },
  { key: "result", label: "Result", icon: PackageCheck, testid: "nav-result" },
  { key: "settings", label: "Settings", icon: Settings2, testid: "nav-settings" },
  { key: "logs", label: "Logs", icon: Terminal, testid: "nav-logs" },
];

export const Sidebar = () => {
  const { screen, navigate, jobs } = useCigs();
  const runningCount = jobs.filter((j) => j.state === "running").length;
  const pendingCount = jobs.filter((j) => j.state === "pending").length;

  const badgeFor = (key) => {
    if (key === "queue" && pendingCount) return pendingCount;
    if (key === "progress" && runningCount) return runningCount;
    return null;
  };

  return (
    <nav className="flex h-full w-[64px] shrink-0 flex-col items-center gap-1 border-r border-border bg-void py-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = screen === item.key;
        const badge = badgeFor(item.key);
        return (
          <Tooltip key={item.key} delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                data-testid={item.testid}
                onClick={() => navigate(item.key)}
                className={cn(
                  "relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
                {badge && (
                  <span
                    className={cn(
                      "absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                      item.key === "progress" ? "bg-live text-live-foreground" : "bg-warning text-warning-foreground"
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
};
