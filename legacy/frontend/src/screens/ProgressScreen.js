import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { StageRail } from "@/components/shared/StageRail";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { STAGES, truncate } from "@/data/seed";
import { Activity, X, PackageCheck, Link2, FileAudio, ArrowRight } from "lucide-react";

export default function ProgressScreen() {
  const { jobs, selectedJobId, navigate, cancelJob } = useCigs();

  const job =
    jobs.find((j) => j.id === selectedJobId && (j.state === "running" || j.state === "pending")) ||
    jobs.find((j) => j.state === "running") ||
    jobs.find((j) => j.id === selectedJobId) ||
    null;

  if (!job) {
    return (
      <Empty onNew={() => navigate("main")} />
    );
  }

  const SourceIcon = job.sourceType === "url" ? Link2 : FileAudio;
  const isRunning = job.state === "running";
  const isPending = job.state === "pending";
  const isDone = job.state === "completed";
  const isFailed = job.state === "failed";
  const activeIndex = job.stageIndex || 0;

  return (
    <div className="cigs-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[980px] p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SourceIcon className="h-4 w-4 text-muted-foreground" />
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{job.title}</h1>
            </div>
            <p className="mono mt-1 truncate text-[12px] text-muted-foreground">{truncate(job.source, 60)}</p>
          </div>
          <StatusPill state={job.state} />
        </div>

        {/* meta strip */}
        <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
          <Meta k="Branch" v={job.branch} />
          <Meta k="Target" v={job.target} />
          <Meta k="Quality" v={job.quality} />
        </div>

        {/* pipeline */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" /> Pipeline
            </span>
            <span data-testid="progress-percent" className="tabular text-sm font-semibold text-foreground">
              {isPending ? "Queued" : `${Math.round(job.progress)}%`}
            </span>
          </div>

          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", isFailed ? "bg-destructive" : isDone ? "bg-success" : "bg-live")}
              style={{ width: `${isPending ? 0 : job.progress}%` }}
            />
          </div>

          <StageRail activeIndex={activeIndex} failed={isFailed} />

          {/* active stage detail */}
          <div className="mt-6 rounded-lg border border-border bg-background p-4">
            {isRunning && (
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-live cigs-pulse" />
                <div>
                  <div className="text-sm font-medium text-foreground">{STAGES[activeIndex]?.label}</div>
                  <div className="mono text-[11px] text-muted-foreground">Stage {activeIndex + 1} of {STAGES.length}</div>
                </div>
              </div>
            )}
            {isPending && (
              <div className="text-sm text-muted-foreground">Waiting in queue — starts at the resolver stage.</div>
            )}
            {isDone && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PackageCheck className="h-5 w-5 text-success" />
                  <div className="text-sm font-medium text-foreground">Pipeline complete — outputs ready</div>
                </div>
                <Button data-testid="progress-view-result-button" size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("result", job.id)}>
                  View result <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {isFailed && (
              <div className="mono text-[12px] text-destructive">{job.error || "Pipeline failed"}</div>
            )}
          </div>

          {(isRunning || isPending) && (
            <div className="mt-4 flex justify-end">
              <Button data-testid="progress-cancel-button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => cancelJob(job.id)}>
                <X className="h-3.5 w-3.5" /> Cancel job
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Meta = ({ k, v }) => (
  <div className="bg-card p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
    <div className="truncate text-sm font-medium text-foreground">{v}</div>
  </div>
);

const Empty = ({ onNew }) => (
  <div className="flex h-full items-center justify-center p-6">
    <div className="max-w-sm text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
        <Activity className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No active job</h2>
      <p className="mt-1 text-sm text-muted-foreground">Start a job from the Main screen to watch the staged pipeline here.</p>
      <Button onClick={onNew} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">Build a job</Button>
    </div>
  </div>
);
