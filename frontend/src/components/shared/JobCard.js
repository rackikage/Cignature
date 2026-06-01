import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { StatusPill } from "@/components/shared/StatusPill";
import { fmtAgo, STAGES, truncate } from "@/data/seed";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Link2,
  FileAudio,
  Play,
  Pause,
  RotateCcw,
  X,
  Trash2,
  ChevronRight,
} from "lucide-react";

// onSelect (optional): when provided, a card click selects the job (updates the
// inspector) instead of navigating. The footer "Open" always navigates.
export const JobCard = ({ job, onSelect }) => {
  const { navigate, selectedJobId, startQueued, retryJob, cancelJob, pauseJob, removeJob, settings } = useCigs();
  const SourceIcon = job.sourceType === "url" ? Link2 : FileAudio;
  const selected = job.id === selectedJobId;

  const open = () => {
    if (job.state === "running" || job.state === "pending") navigate("progress", job.id);
    else navigate("result", job.id);
  };
  const handleClick = () => (onSelect ? onSelect(job.id) : open());

  const accent =
    job.state === "running"
      ? "before:bg-primary"
      : job.state === "failed"
      ? "before:bg-destructive"
      : job.state === "completed"
      ? "before:bg-primary/40"
      : "before:bg-border";

  return (
    <div
      data-testid="job-card"
      data-selected={selected || undefined}
      onClick={handleClick}
      className={cn(
        "group relative cursor-pointer rounded-xl border bg-card p-4 pl-5 transition-colors",
        "before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-full",
        accent,
        selected
          ? "border-primary/45 bg-surface-2 ring-1 ring-primary/40"
          : "border-border hover:border-border hover:bg-surface-2"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SourceIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <h3 className="truncate text-sm font-semibold text-foreground">{job.title}</h3>
          </div>
          <p className="mono mt-1 truncate text-[11px] text-muted-foreground">{truncate(job.source, 54)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Tag>{job.branch}</Tag>
            <Tag>{job.target}</Tag>
            <Tag>{job.quality}</Tag>
          </div>
          {job.state === "running" && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="text-primary">{STAGES[job.stageIndex]?.label}</span>
                <span className="tabular text-foreground">{Math.round(job.progress)}%</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${job.progress}%` }} />
              </div>
            </div>
          )}
          {job.state === "failed" && job.error && (
            <p className="mono mt-2 text-[11px] text-destructive">{job.error}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusPill state={job.state} />
          <span className="mono text-[10px] text-muted-foreground">{fmtAgo(job.createdAt)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {job.state === "running" && (
            <>
              <Action testid="job-pause-button" icon={Pause} label="Pause" onClick={() => pauseJob(job.id)} />
              <Destructive
                testid="job-cancel-button"
                icon={X}
                label="Cancel"
                confirm={settings.confirmDestructive}
                title="Cancel this job?"
                body={`"${truncate(job.title, 40)}" will be marked as failed. This is a demo — nothing real is stopped.`}
                onConfirm={() => cancelJob(job.id)}
              />
            </>
          )}
          {job.state === "pending" && (
            <>
              <Action testid="job-start-button" icon={Play} label="Start" onClick={() => startQueued(job.id)} />
              <Destructive
                testid="job-remove-button"
                icon={Trash2}
                label="Remove"
                confirm={settings.confirmDestructive}
                title="Remove from queue?"
                body={`"${truncate(job.title, 40)}" will be removed from the queue.`}
                onConfirm={() => removeJob(job.id)}
              />
            </>
          )}
          {job.state === "failed" && (
            <>
              <Action testid="job-retry-button" icon={RotateCcw} label="Retry" onClick={() => retryJob(job.id)} />
              <Destructive
                testid="job-remove-button"
                icon={Trash2}
                label="Remove"
                confirm={settings.confirmDestructive}
                title="Remove from queue?"
                body={`"${truncate(job.title, 40)}" will be removed from the queue.`}
                onConfirm={() => removeJob(job.id)}
              />
            </>
          )}
          {job.state === "completed" && (
            <Action testid="job-retry-button" icon={RotateCcw} label="Re-run" onClick={() => retryJob(job.id)} />
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {job.state === "completed" || job.state === "failed" ? "View result" : "Open"}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

const Tag = ({ children }) => (
  <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-medium text-muted-foreground">
    {children}
  </span>
);

const Action = ({ icon: Icon, label, onClick, danger, testid }) => (
  <Button
    data-testid={testid}
    variant="ghost"
    size="sm"
    onClick={onClick}
    className={cn(
      "h-7 gap-1.5 px-2 text-[11px]",
      danger
        ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </Button>
);

// Destructive action — gated behind a confirm dialog when the user has
// "Confirm destructive actions" enabled in Settings; otherwise fires directly.
const Destructive = ({ icon: Icon, label, onConfirm, confirm, title, body, testid }) => {
  if (!confirm) return <Action testid={testid} icon={Icon} label={label} danger onClick={onConfirm} />;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          data-testid={testid}
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
