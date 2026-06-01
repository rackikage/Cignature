import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { truncate } from "@/data/seed";
import { ChevronRight, Terminal } from "lucide-react";

// Always-visible plain-language readout of the current builder path, e.g.
//   Audio › Vocals › High — would start a local job
// Steps not yet chosen render as muted placeholders.
export const CommandSummary = () => {
  const { builder } = useCigs();
  const sourceOk = builder.sourceType === "url" ? !!builder.url.trim() : !!builder.fileName;
  const sourceLabel = sourceOk
    ? truncate(builder.sourceType === "url" ? builder.url : builder.fileName, 22)
    : "source";

  const steps = [
    { v: sourceOk ? sourceLabel : null, placeholder: "source" },
    { v: builder.branch, placeholder: "branch" },
    { v: builder.target, placeholder: "target" },
    { v: builder.quality, placeholder: "quality" },
  ];

  const complete = sourceOk && builder.branch && builder.target && builder.quality;
  const outcome = complete
    ? "would start a local job"
    : "complete the path to start a local job";

  return (
    <div
      data-testid="command-summary"
      className="flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-3 py-2"
    >
      <Terminal className={cn("h-3.5 w-3.5 shrink-0", complete ? "text-primary" : "text-muted-foreground")} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-border" />}
            <span
              className={cn(
                "mono text-[12px]",
                s.v ? "font-medium text-foreground" : "text-muted-foreground/60"
              )}
            >
              {s.v || s.placeholder}
            </span>
          </React.Fragment>
        ))}
        <span className="mx-1 text-border">—</span>
        <span className={cn("text-[12px]", complete ? "text-primary" : "text-muted-foreground")}>
          {outcome}
        </span>
      </div>
    </div>
  );
};
