import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { STAGES, fmtAgo, fmtClock, truncate, previewFilename } from "@/data/seed";
import {
  PanelRight,
  ListChecks,
  Activity,
  PackageCheck,
  Settings2,
  Terminal,
  FolderOpen,
  FolderTree,
  Copy,
  RotateCcw,
  ArrowRight,
  FileText,
  AlertTriangle,
} from "lucide-react";

const HEAD = {
  main: { icon: PanelRight, label: "Job inspector" },
  queue: { icon: ListChecks, label: "Selected job" },
  progress: { icon: Activity, label: "Live detail" },
  result: { icon: PackageCheck, label: "Output actions" },
  settings: { icon: Settings2, label: "Effect preview" },
  logs: { icon: Terminal, label: "Log detail" },
};

export const Inspector = () => {
  const { screen } = useCigs();
  const head = HEAD[screen] || HEAD.main;
  const Icon = head.icon;

  return (
    <aside data-testid="inspector" className="flex h-full flex-col bg-void">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-4">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {head.label}
        </span>
      </div>
      <div className="cigs-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {screen === "main" && <MainInspector />}
        {screen === "queue" && <QueueInspector />}
        {screen === "progress" && <ProgressInspector />}
        {screen === "result" && <ResultInspector />}
        {screen === "settings" && <SettingsInspector />}
        {screen === "logs" && <LogsInspector />}
      </div>
    </aside>
  );
};

/* ---------- shared bits ---------- */

const Section = ({ label, children, className }) => (
  <section className={cn("mb-5", className)}>
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    {children}
  </section>
);

const Field = ({ k, v, mono }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</span>
    <span className={cn("min-w-0 truncate text-right text-[13px] font-medium text-foreground", mono && "mono text-[12px]")}>
      {v || "—"}
    </span>
  </div>
);

const Empty = ({ icon: Icon, title, body }) => (
  <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-4 text-center">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
      <Icon className="h-5 w-5" />
    </div>
    <div className="text-sm font-medium text-foreground">{title}</div>
    <p className="mt-1 text-[12px] text-muted-foreground">{body}</p>
  </div>
);

/* ---------- main ---------- */

const MainInspector = () => {
  const { builder, logs } = useCigs();
  const sourceOk = builder.sourceType === "url" ? !!builder.url.trim() : !!builder.fileName;
  const recent = logs.slice(0, 5);
  return (
    <>
      <Section label="Job path">
        <div className="rounded-lg border border-border bg-card px-3 py-1">
          <Field k="Source" v={sourceOk ? (builder.sourceType === "url" ? "URL" : "Local file") : null} />
          <Field k="Branch" v={builder.branch} />
          <Field k="Target" v={builder.target} />
          <Field k="Quality" v={builder.quality} />
        </div>
      </Section>
      <Section label="Recent activity">
        <div className="space-y-2">
          {recent.map((l) => (
            <div key={l.id} className="flex items-start gap-2 text-[12px]">
              <span className="mono shrink-0 text-[10px] tabular text-muted-foreground">{fmtClock(l.ts)}</span>
              <span className="min-w-0 text-foreground/80">{l.msg}</span>
            </div>
          ))}
        </div>
      </Section>
      <p className="text-[11px] text-muted-foreground">
        Tip: press <span className="mono text-foreground">⌘↵</span> to start, <span className="mono text-foreground">⌘⇧↵</span> to queue.
      </p>
    </>
  );
};

/* ---------- queue ---------- */

const QueueInspector = () => {
  const { jobs, selectedJobId, navigate } = useCigs();
  const job = jobs.find((j) => j.id === selectedJobId);
  if (!job) return <Empty icon={ListChecks} title="No job selected" body="Click a job in the queue to inspect it here." />;
  return <JobDetail job={job} onOpen={() => navigate(job.state === "completed" || job.state === "failed" ? "result" : "progress", job.id)} />;
};

const JobDetail = ({ job, onOpen }) => (
  <>
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <StatusPill state={job.state} />
        <span className="mono text-[10px] text-muted-foreground">{fmtAgo(job.createdAt)}</span>
      </div>
      <h3 className="truncate text-sm font-semibold text-foreground">{job.title}</h3>
      <p className="mono mt-1 truncate text-[11px] text-muted-foreground">{job.source}</p>
    </div>
    <div className="rounded-lg border border-border bg-card px-3 py-1">
      <Field k="Branch" v={job.branch} />
      <Field k="Target" v={job.target} />
      <Field k="Quality" v={job.quality} />
    </div>
    {job.state === "running" && (
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-primary">{STAGES[job.stageIndex]?.label}</span>
          <span className="tabular text-foreground">{Math.round(job.progress)}%</span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${job.progress}%` }} />
        </div>
      </div>
    )}
    {job.state === "failed" && job.error && (
      <p className="mono mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-[11px] text-destructive">{job.error}</p>
    )}
    {job.state === "completed" && job.outputs && (
      <p className="mt-3 text-[12px] text-muted-foreground">{job.outputs.length} output file{job.outputs.length !== 1 ? "s" : ""} ready.</p>
    )}
    <Button size="sm" className="mt-4 w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={onOpen}>
      Open <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  </>
);

/* ---------- progress ---------- */

const ProgressInspector = () => {
  const { jobs, selectedJobId, logs } = useCigs();
  const job =
    jobs.find((j) => j.id === selectedJobId && (j.state === "running" || j.state === "pending")) ||
    jobs.find((j) => j.state === "running") ||
    jobs.find((j) => j.id === selectedJobId) ||
    null;
  if (!job) return <Empty icon={Activity} title="No active job" body="Start a job to watch its live log here." />;
  const tail = logs.filter((l) => l.jobId === job.id).slice(0, 14);
  return (
    <>
      <Section label="Stage">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">
              {job.state === "running" ? STAGES[job.stageIndex]?.label : job.state === "pending" ? "Queued" : "Done"}
            </span>
            <span className="tabular text-[13px] font-semibold text-foreground">{Math.round(job.progress)}%</span>
          </div>
        </div>
      </Section>
      <Section label="Live log" className="mb-0">
        {tail.length ? (
          <div className="space-y-1.5">
            {tail.map((l) => (
              <div key={l.id} className="flex items-start gap-2">
                <span className="mono shrink-0 text-[10px] tabular text-muted-foreground">{fmtClock(l.ts)}</span>
                <span className={cn("mono min-w-0 text-[11px]", l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-warning" : "text-foreground/80")}>
                  {l.msg}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">No log lines for this job yet.</p>
        )}
      </Section>
    </>
  );
};

/* ---------- result ---------- */

const ResultInspector = () => {
  const { jobs, selectedJobId, navigate, retryJob } = useCigs();
  const job =
    jobs.find((j) => j.id === selectedJobId && (j.state === "completed" || j.state === "failed")) ||
    jobs.find((j) => j.state === "completed") ||
    jobs.find((j) => j.state === "failed") ||
    null;
  if (!job) return <Empty icon={PackageCheck} title="No finished job" body="Completed or failed jobs show their actions here." />;
  const failed = job.state === "failed";
  return (
    <>
      <Section label="Details">
        <div className="rounded-lg border border-border bg-card px-3 py-1">
          <Field k="Branch" v={job.branch} />
          <Field k="Output" v={job.target} />
          <Field k="Quality" v={job.quality} />
          <Field k="Source" v={job.sourceType === "url" ? "URL" : "Local file"} />
          <Field k={failed ? "Failed" : "Finished"} v={fmtAgo(job.failedAt || job.completedAt || job.createdAt)} />
        </div>
      </Section>
      <Section label="Actions" className="mb-0">
        {failed ? (
          <div className="space-y-2">
            <div className="mono rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-[11px] text-destructive">
              <AlertTriangle className="mb-1 h-3.5 w-3.5" />
              {job.error}
            </div>
            <Button size="sm" className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => retryJob(job.id)}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry job
            </Button>
            <ActionRow icon={Terminal} label="View logs" onClick={() => navigate("logs", job.id)} />
          </div>
        ) : (
          <div className="space-y-2">
            <ActionRow icon={FolderOpen} label="Reveal in Finder" onClick={() => toast("Would reveal packaged output in Finder")} />
            <ActionRow icon={FolderTree} label="Open output folder" onClick={() => toast("Would open the output folder")} />
            {job.target?.includes("Transcript") && (
              <ActionRow icon={Copy} label="Copy transcript" onClick={() => toast.success("Would copy transcript to clipboard")} />
            )}
            <ActionRow icon={Terminal} label="View logs" onClick={() => navigate("logs", job.id)} />
          </div>
        )}
      </Section>
    </>
  );
};

const ActionRow = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-foreground/90 transition-colors hover:border-primary/40 hover:bg-surface-2"
  >
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    {label}
  </button>
);

/* ---------- settings ---------- */

const SettingsInspector = () => {
  const { settings } = useCigs();
  const file = previewFilename(settings);
  return (
    <>
      <Section label="Output preview">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Would write</div>
          <div className="mono mt-1 break-all text-[12px] text-foreground">
            {settings.outputLocation}/<span className="text-primary">{file}</span>
          </div>
        </div>
      </Section>
      <Section label="Packaging">
        <div className="rounded-lg border border-border bg-card px-3 py-1">
          <Field k="Format" v={settings.packageFormat} />
          <Field k="Manifest" v={settings.includeManifest ? "Included" : "Omitted"} />
          <Field k="Auto-package" v={settings.autoZip ? "On" : "Off"} />
          <Field k="Overwrite" v={settings.overwrite} />
        </div>
      </Section>
      <Section label="Defaults" className="mb-0">
        <div className="rounded-lg border border-border bg-card px-3 py-1">
          <Field k="Quality" v={settings.defaultQuality} />
          <Field k="Output type" v={settings.defaultOutputType} />
          <Field k="Transcript" v={settings.transcriptFormat} />
          <Field k="Audio" v={settings.audioFormat} />
        </div>
      </Section>
    </>
  );
};

/* ---------- logs ---------- */

const LogsInspector = () => {
  const { logs, jobs, selectedLogId } = useCigs();
  const counts = {
    info: logs.filter((l) => l.level === "info").length,
    warn: logs.filter((l) => l.level === "warn").length,
    error: logs.filter((l) => l.level === "error").length,
  };
  const sel = logs.find((l) => l.id === selectedLogId);
  const jobTitle = sel?.jobId ? jobs.find((j) => j.id === sel.jobId)?.title : null;

  return (
    <>
      <Section label="Counts">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Info" value={counts.info} />
          <Stat label="Warn" value={counts.warn} tone="warn" />
          <Stat label="Error" value={counts.error} tone="error" />
        </div>
      </Section>
      <Section label="Selected entry" className="mb-0">
        {sel ? (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="mono text-[11px] tabular text-muted-foreground">{fmtClock(sel.ts)}</span>
              <span
                className={cn(
                  "mono rounded px-1.5 text-[10px] font-semibold uppercase",
                  sel.level === "error" ? "bg-destructive/10 text-destructive" : sel.level === "warn" ? "bg-[hsl(var(--warning)/0.12)] text-warning" : "bg-muted text-muted-foreground"
                )}
              >
                {sel.level}
              </span>
            </div>
            <p className="mono text-[12px] text-foreground/90">{sel.msg}</p>
            {jobTitle && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FileText className="h-3 w-3" /> {truncate(jobTitle, 32)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">Click a log line to see its full detail.</p>
        )}
      </Section>
    </>
  );
};

const Stat = ({ label, value, tone }) => (
  <div className="rounded-lg border border-border bg-card p-2.5 text-center">
    <div
      className={cn(
        "tabular text-lg font-semibold",
        tone === "error" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground"
      )}
    >
      {value}
    </div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);
