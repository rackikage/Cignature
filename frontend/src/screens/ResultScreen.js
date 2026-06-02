import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmtAgo, truncate } from "@/data/seed";
import {
  PackageCheck,
  Download,
  FolderOpen,
  Copy,
  FolderTree,
  FileText,
  Music2,
  Film,
  Archive,
  AudioWaveform,
  RotateCcw,
  AlertTriangle,
  Link2,
  FileAudio,
} from "lucide-react";

const KIND_ICON = {
  transcript: FileText,
  stem: AudioWaveform,
  audio: Music2,
  media: Film,
  archive: Archive,
};

export default function ResultScreen() {
  const { jobs, selectedJobId, navigate, retryJob } = useCigs();

  const job =
    jobs.find((j) => j.id === selectedJobId && (j.state === "completed" || j.state === "failed")) ||
    jobs.find((j) => j.state === "completed") ||
    jobs.find((j) => j.state === "failed") ||
    null;

  if (!job) return <Empty onNew={() => navigate("main")} />;

  const failed = job.state === "failed";
  const SourceIcon = job.sourceType === "url" ? Link2 : FileAudio;
  const outputs = job.outputs || [];

  return (
    <div className="cigs-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[920px] p-6">
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

        {/* summary card */}
        <div className={cn("rounded-xl border bg-card p-5", failed ? "border-destructive/40" : "border-border")}>
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", failed ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
              {failed ? <AlertTriangle className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                {failed ? "Job failed" : "Outputs ready"}
              </div>
              <div className="text-[12px] text-muted-foreground">
                {failed ? "Resolve the issue and retry" : `${outputs.length} files · ${fmtAgo(job.completedAt || job.createdAt)}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 text-sm sm:grid-cols-4">
            <Summary k="Branch" v={job.branch} />
            <Summary k="Output mode" v={job.target} />
            <Summary k="Quality" v={job.quality} />
            <Summary k="Source" v={job.sourceType === "url" ? "URL" : "Local file"} />
          </div>

          {failed ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <div className="mono text-[12px] text-destructive">{job.error}</div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <FolderTree className="h-3.5 w-3.5" /> Output summary
                </span>
              </div>
              <ul data-testid="result-output-list" className="divide-y divide-border">
                {outputs.map((o, i) => {
                  const Icon = KIND_ICON[o.kind] || FileText;
                  return (
                    <li key={i} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="mono truncate text-[12px] text-foreground">{o.name}</span>
                      </div>
                      <span className="mono shrink-0 text-[11px] text-muted-foreground">{o.size}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {failed ? (
            <Button data-testid="result-retry-button" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => retryJob(job.id)}>
              <RotateCcw className="h-4 w-4" /> Retry job
            </Button>
          ) : (
            <>
              <Button data-testid="result-download-zip-button" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => toast.success("Would package results into a single ZIP")}>
                <Download className="h-4 w-4" /> Download ZIP
              </Button>
              <Button data-testid="result-reveal-finder-button" variant="outline" className="gap-2" onClick={() => toast("Would reveal packaged output in Finder")}>
                <FolderOpen className="h-4 w-4" /> Reveal in Finder
              </Button>
              <Button data-testid="result-open-folder-button" variant="outline" className="gap-2" onClick={() => toast("Would open the output folder")}>
                <FolderTree className="h-4 w-4" /> Open folder
              </Button>
              {job.target?.includes("Transcript") && (
                <Button data-testid="result-copy-transcript-button" variant="outline" className="gap-2" onClick={() => toast.success("Would copy transcript to clipboard")}>
                  <Copy className="h-4 w-4" /> Copy transcript
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => navigate("logs", job.id)}>
            View logs
          </Button>
        </div>
      </div>
    </div>
  );
}

const Summary = ({ k, v }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
    <div className="truncate text-sm font-medium text-foreground">{v}</div>
  </div>
);

const Empty = ({ onNew }) => (
  <div className="flex h-full items-center justify-center p-6">
    <div className="max-w-sm text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
        <PackageCheck className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No finished jobs</h2>
      <p className="mt-1 text-sm text-muted-foreground">Completed and failed jobs show their result detail here.</p>
      <Button onClick={onNew} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">Build a job</Button>
    </div>
  </div>
);
