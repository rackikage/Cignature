import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { JobCard } from "@/components/shared/JobCard";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpDown, Plus, Inbox } from "lucide-react";

const GROUPS = [
  { key: "running", label: "Running" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

export default function QueueScreen() {
  const { jobs, navigate, clearCompleted, reorderHint } = useCigs();
  const byState = (s) => jobs.filter((j) => j.state === s);

  return (
    <div className="cigs-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[1100px] p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Queue</h1>
            <p className="mt-1 text-sm text-muted-foreground">{jobs.length} job{jobs.length !== 1 ? "s" : ""} · grouped by state</p>
          </div>
          <div className="flex items-center gap-2">
            <Button data-testid="queue-reorder-button" variant="outline" size="sm" className="gap-1.5" onClick={reorderHint}>
              <ArrowUpDown className="h-3.5 w-3.5" /> Reorder
            </Button>
            <Button data-testid="queue-clear-completed-button" variant="outline" size="sm" className="gap-1.5" onClick={clearCompleted}>
              <Trash2 className="h-3.5 w-3.5" /> Clear completed
            </Button>
            <Button data-testid="queue-new-job-button" size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("main")}>
              <Plus className="h-3.5 w-3.5" /> New job
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {GROUPS.map((g) => {
            const items = byState(g.key);
            return (
              <section key={g.key} data-testid={`queue-group-${g.key}`}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</h2>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">{items.length}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {items.length ? (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {items.map((j) => (
                      <JobCard key={j.id} job={j} />
                    ))}
                  </div>
                ) : (
                  <EmptyRow label={g.label} />
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const EmptyRow = ({ label }) => (
  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/40 px-4 py-3 text-[12px] text-muted-foreground">
    <Inbox className="h-3.5 w-3.5" />
    No {label.toLowerCase()} jobs
  </div>
);
