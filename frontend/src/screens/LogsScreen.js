import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtClock, truncate } from "@/data/seed";
import { Search, Terminal } from "lucide-react";

const LEVELS = [
  { key: "all", label: "All" },
  { key: "info", label: "Info" },
  { key: "warn", label: "Warn" },
  { key: "error", label: "Error" },
];

const LEVEL_CLS = {
  info: "text-muted-foreground",
  warn: "text-warning",
  error: "text-destructive",
};

export default function LogsScreen() {
  const { logs, jobs, selectedJobId } = useCigs();
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("all");

  const jobName = (id) => jobs.find((j) => j.id === id)?.title;

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (level !== "all" && l.level !== level) return false;
      if (jobFilter !== "all" && l.jobId !== jobFilter) return false;
      if (query && !l.msg.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [logs, level, jobFilter, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
              <Terminal className="h-5 w-5 text-primary" /> Logs
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Structured pipeline output · {filtered.length} entries</p>
          </div>
        </div>

        {/* filters */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tabs value={level} onValueChange={setLevel}>
            <TabsList data-testid="logs-filter-tabs" className="h-9">
              {LEVELS.map((l) => (
                <TabsTrigger key={l.key} value={l.key} className="text-xs data-[state=active]:text-primary">
                  {l.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="logs-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter logs"
              className="mono h-9 w-[200px] bg-background pl-8 text-xs"
            />
          </div>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger data-testid="logs-job-filter" className="h-9 w-[220px] text-xs">
              <SelectValue placeholder="All jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All jobs</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id} className="text-xs">{truncate(j.title, 30)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* log table */}
        <div data-testid="logs-table" className="cigs-scroll flex-1 overflow-y-auto rounded-xl border border-border bg-card">
          {filtered.length ? (
            <div className="divide-y divide-border/70">
              {filtered.map((l) => (
                <div key={l.id} className="flex items-start gap-3 px-3 py-2 hover:bg-surface-2">
                  <span className="mono shrink-0 text-[11px] tabular text-muted-foreground">{fmtClock(l.ts)}</span>
                  <span
                    className={cn(
                      "mono shrink-0 rounded px-1.5 text-[10px] font-semibold uppercase",
                      l.level === "error" ? "bg-destructive/10 text-destructive" : l.level === "warn" ? "bg-[hsl(var(--warning)/0.12)] text-warning" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {l.level}
                  </span>
                  <span className="mono min-w-0 flex-1 text-[12px] text-foreground/90">{l.msg}</span>
                  {l.jobId && jobName(l.jobId) && (
                    <span className="mono shrink-0 text-[10px] text-muted-foreground">{truncate(jobName(l.jobId), 22)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
              No log entries match these filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
