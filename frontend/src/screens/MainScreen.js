import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { CircularHub } from "@/components/CircularHub";
import { targetsForBranch, QUALITIES, truncate } from "@/data/seed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AnimatePresence, motion } from "framer-motion";
import {
  Link2,
  FolderOpen,
  Play,
  Plus,
  X,
  Disc3,
  Mic,
  Guitar,
  FileText,
  SlidersHorizontal,
  Zap,
  Gauge,
  Sparkles,
  RotateCcw,
} from "lucide-react";

const TARGET_ICONS = {
  "Original / Song": Disc3,
  Vocals: Mic,
  Instrumental: Guitar,
  Transcript: FileText,
  Stems: SlidersHorizontal,
};
const QUALITY_ICONS = { Fast: Zap, Medium: Gauge, High: Sparkles };

const reveal = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
};

export default function MainScreen() {
  const { builder, patchBuilder, startJob, addToQueue, resetBuilder } = useCigs();
  const sourceOk = builder.sourceType === "url" ? !!builder.url.trim() : !!builder.fileName;
  const targets = builder.branch ? targetsForBranch(builder.branch) : [];

  const pickFile = () => {
    const names = ["live_take_02.wav", "podcast_ep_114.mp3", "masterclass.mov", "rehearsal_room.flac"];
    const fileName = names[Math.floor(Math.random() * names.length)];
    patchBuilder({ fileName });
  };

  return (
    <div className="cigs-scroll h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* LEFT — source + hub */}
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Build a job</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Provide a source, then choose a branch in the hub. The path expands step by step.
            </p>
          </div>

          {/* Source card */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <PanelLabel>Source</PanelLabel>
              <ToggleGroup
                type="single"
                value={builder.sourceType}
                onValueChange={(v) => v && patchBuilder({ sourceType: v })}
                className="gap-1"
              >
                <ToggleGroupItem data-testid="source-type-url" value="url" className="h-7 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
                  <Link2 className="h-3.5 w-3.5" /> URL
                </ToggleGroupItem>
                <ToggleGroupItem data-testid="source-type-file" value="file" className="h-7 gap-1.5 px-2.5 text-xs data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
                  <FolderOpen className="h-3.5 w-3.5" /> File
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {builder.sourceType === "url" ? (
              <Input
                data-testid="source-url-input"
                value={builder.url}
                onChange={(e) => patchBuilder({ url: e.target.value })}
                placeholder="https:// paste a media URL"
                className="mono h-10 bg-background text-sm"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  data-testid="source-file-pick-button"
                  variant="outline"
                  onClick={pickFile}
                  className="h-10 gap-2"
                >
                  <FolderOpen className="h-4 w-4" /> Pick local file
                </Button>
                <div className="mono min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  {builder.fileName || "No file selected"}
                </div>
              </div>
            )}
          </div>

          {/* Hub */}
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4">
            <div className="mb-2 w-full">
              <PanelLabel>Branch · hub</PanelLabel>
            </div>
            <CircularHub value={builder.branch} onSelect={(b) => patchBuilder({ branch: b })} />
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              Audio, Complete, or Video — tap a node to branch the tree.
            </p>
          </div>
        </div>

        {/* RIGHT — decision tree */}
        <div className="space-y-4">
          {/* breadcrumb */}
          <div data-testid="job-builder-breadcrumb" className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5">
            <Crumb active={sourceOk} onClick={() => {}} label={sourceOk ? truncate(builder.sourceType === "url" ? builder.url : builder.fileName, 18) : "Source"} />
            <Sep />
            <Crumb active={!!builder.branch} onClick={() => patchBuilder({ branch: null })} label={builder.branch || "Branch"} />
            <Sep />
            <Crumb active={!!builder.target} onClick={() => patchBuilder({ target: null })} label={builder.target || "Target"} />
            <Sep />
            <Crumb active={!!builder.quality} label={builder.quality || "Quality"} />
            <button
              onClick={resetBuilder}
              className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {/* Target step */}
            {builder.branch ? (
              <motion.div key="target" layout {...reveal} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <PanelLabel>Extraction target</PanelLabel>
                  {builder.target && (
                    <button onClick={() => patchBuilder({ target: null })} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" /> Reset
                    </button>
                  )}
                </div>
                <RadioGroup
                  value={builder.target || ""}
                  onValueChange={(v) => patchBuilder({ target: v })}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {targets.map((t) => {
                    const Icon = TARGET_ICONS[t.key];
                    const active = builder.target === t.key;
                    return (
                      <label
                        key={t.key}
                        data-testid={`target-${t.key.replace(/[^a-z]/gi, "-").toLowerCase()}`}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                          active ? "border-accent/60 bg-accent/10" : "border-border hover:border-border hover:bg-surface-2"
                        )}
                      >
                        <RadioGroupItem value={t.key} className="sr-only" />
                        <Icon className={cn("mt-0.5 h-4 w-4", active ? "text-accent" : "text-muted-foreground")} />
                        <div className="min-w-0">
                          <div className={cn("text-sm font-medium", active ? "text-foreground" : "text-foreground/90")}>{t.key}</div>
                          <div className="text-[11px] text-muted-foreground">{t.sub}</div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </motion.div>
            ) : (
              <motion.div key="target-empty" {...reveal} className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                <p className="text-sm text-muted-foreground">Select a branch in the hub to reveal extraction targets.</p>
              </motion.div>
            )}

            {/* Quality step */}
            {builder.target && (
              <motion.div key="quality" layout {...reveal} className="rounded-xl border border-border bg-card p-4">
                <PanelLabel className="mb-3 block">Quality preset</PanelLabel>
                <div className="grid grid-cols-3 gap-2">
                  {QUALITIES.map((q) => {
                    const Icon = QUALITY_ICONS[q.key];
                    const active = builder.quality === q.key;
                    return (
                      <button
                        key={q.key}
                        data-testid={`quality-${q.key.toLowerCase()}`}
                        onClick={() => patchBuilder({ quality: q.key })}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
                          active ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-semibold">{q.key}</span>
                        <span className="text-[10px] text-muted-foreground">{q.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Confirm step */}
            {builder.target && (
              <motion.div key="confirm" layout {...reveal} className="rounded-xl border border-border bg-card p-4">
                <PanelLabel className="mb-3 block">Confirm</PanelLabel>
                <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <Summary k="Source" v={builder.sourceType === "url" ? "URL" : "File"} />
                  <Summary k="Branch" v={builder.branch} />
                  <Summary k="Target" v={builder.target} />
                  <Summary k="Quality" v={builder.quality} />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    data-testid="job-confirm-start-button"
                    onClick={startJob}
                    className="h-10 flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4" /> Start job
                  </Button>
                  <Button
                    data-testid="job-confirm-add-to-queue-button"
                    variant="outline"
                    onClick={addToQueue}
                    className="h-10 flex-1 gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add to queue
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const PanelLabel = ({ children, className }) => (
  <span className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", className)}>{children}</span>
);
const Summary = ({ k, v }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
    <div className="truncate text-sm font-medium text-foreground">{v}</div>
  </div>
);
const Sep = () => <span className="text-border">›</span>;
const Crumb = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={cn(
      "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground",
      onClick && "hover:bg-surface-2"
    )}
  >
    {label}
  </button>
);
