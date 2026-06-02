import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { toast } from "sonner";
import {
  SEED_JOBS,
  SEED_LOGS,
  DEFAULT_SETTINGS,
  STAGES,
  stageIndexFromProgress,
  buildOutputs,
  uid,
  truncate,
} from "@/data/seed";

const CigsContext = createContext(null);
export const useCigs = () => {
  const ctx = useContext(CigsContext);
  if (!ctx) throw new Error("useCigs must be used within CigsProvider");
  return ctx;
};

function sourceTitle(b) {
  if (b.sourceType === "file") return b.fileName || "Local file";
  const u = (b.url || "").trim();
  if (!u) return "Untitled source";
  try {
    const host = new URL(u).host.replace(/^www\./, "");
    return `New capture — ${host}`;
  } catch {
    return `Pasted URL — ${truncate(u, 28)}`;
  }
}

export const CigsProvider = ({ children }) => {
  // Cigs is dark-only — there is no theme toggle. Lock the class once.
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const [screen, setScreen] = useState("main");
  const [selectedJobId, setSelectedJobId] = useState("job_seed_run");
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [jobs, setJobs] = useState(SEED_JOBS);
  const [logs, setLogs] = useState(SEED_LOGS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [builder, setBuilder] = useState({
    sourceType: "url",
    url: "",
    fileName: "",
    branch: null,
    target: null,
    quality: DEFAULT_SETTINGS.defaultQuality,
  });

  // ---- logs ----
  const addLog = useCallback((level, msg, jobId = null) => {
    setLogs((prev) =>
      [{ id: uid("log"), ts: Date.now(), level, msg, jobId }, ...prev].slice(0, 250)
    );
  }, []);

  // ---- navigation ----
  const navigate = useCallback((next, jobId) => {
    setScreen(next);
    if (jobId !== undefined) setSelectedJobId(jobId);
  }, []);

  // ---- demo progress ticker (visual only, no real work) ----
  useEffect(() => {
    const t = setInterval(() => {
      setJobs((prev) => {
        let changed = false;
        const next = prev.map((j) => {
          if (j.state !== "running") return j;
          const hold = j.holdAt ?? 100;
          if (j.progress >= hold) return j;
          changed = true;
          const p = Math.min(hold, j.progress + (1.6 + Math.random() * 2.6));
          const si = stageIndexFromProgress(p);
          if (p >= 100) {
            return {
              ...j,
              progress: 100,
              stageIndex: STAGES.length - 1,
              state: "completed",
              completedAt: Date.now(),
              outputs: buildOutputs(j),
            };
          }
          return { ...j, progress: p, stageIndex: si };
        });
        return changed ? next : prev;
      });
    }, 480);
    return () => clearInterval(t);
  }, []);

  // fire side-effects (toast/log) when a job transitions to completed
  const completedRef = useRef(
    new Set(SEED_JOBS.filter((j) => j.state === "completed").map((j) => j.id))
  );
  useEffect(() => {
    jobs.forEach((j) => {
      if (j.state === "completed" && !completedRef.current.has(j.id)) {
        completedRef.current.add(j.id);
        addLog("info", `Packaging complete — would write outputs for "${j.title}"`, j.id);
        toast.success(`Would finalize "${truncate(j.title, 30)}" and write outputs`);
      }
    });
  }, [jobs, addLog]);

  // ---- builder helpers ----
  const patchBuilder = useCallback((patch) => {
    setBuilder((prev) => {
      const next = { ...prev, ...patch };
      // clear downstream selections when an upstream step changes
      if ("branch" in patch && patch.branch !== prev.branch) next.target = null;
      return next;
    });
  }, []);

  const resetBuilder = useCallback(() => {
    setBuilder({
      sourceType: "url",
      url: "",
      fileName: "",
      branch: null,
      target: null,
      quality: settings.defaultQuality,
    });
    toast("Job path cleared");
  }, [settings.defaultQuality]);

  const validateBuilder = useCallback((b) => {
    if (b.sourceType === "url" && !b.url.trim()) {
      toast.error("Paste a source URL first");
      return false;
    }
    if (b.sourceType === "file" && !b.fileName) {
      toast.error("Pick a local file first");
      return false;
    }
    if (!b.branch) {
      toast.error("Select a branch in the hub");
      return false;
    }
    if (!b.target) {
      toast.error("Choose an extraction target");
      return false;
    }
    return true;
  }, []);

  const makeJob = (b, state) => ({
    id: uid("job"),
    title: sourceTitle(b),
    sourceType: b.sourceType,
    source: b.sourceType === "url" ? b.url.trim() : b.fileName,
    branch: b.branch,
    target: b.target,
    quality: b.quality,
    state,
    progress: state === "running" ? 4 : 0,
    stageIndex: 0,
    holdAt: 100,
    createdAt: Date.now(),
  });

  const startJob = useCallback(() => {
    if (!validateBuilder(builder)) return;
    const job = makeJob(builder, "running");
    setJobs((prev) => [job, ...prev]);
    addLog("info", `URL parsed — would start ${job.branch} pipeline`, job.id);
    addLog("info", `${job.branch} · ${job.target} · ${job.quality} preset selected`, job.id);
    toast.success(`Would start ${job.branch} job with ${job.quality} quality`);
    setSelectedJobId(job.id);
    setScreen("progress");
    resetBuilder();
  }, [builder, addLog, validateBuilder, resetBuilder]);

  const addToQueue = useCallback(() => {
    if (!validateBuilder(builder)) return;
    const job = makeJob(builder, "pending");
    setJobs((prev) => [...prev, job]);
    addLog("info", `Queued "${job.title}" — would process locally`, job.id);
    toast(`Would queue ${job.branch} · ${job.target} for local processing`);
    resetBuilder();
  }, [builder, addLog, validateBuilder, resetBuilder]);

  // ---- job actions (cosmetic only) ----
  const startQueued = useCallback(
    (id) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, state: "running", progress: 4, stageIndex: 0, holdAt: 100 } : j
        )
      );
      const j = jobs.find((x) => x.id === id);
      addLog("info", `Would begin local processing for "${j?.title}"`, id);
      toast.success(`Would start "${truncate(j?.title || "job", 28)}"`);
      setSelectedJobId(id);
      setScreen("progress");
    },
    [jobs, addLog]
  );

  const retryJob = useCallback(
    (id) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? { ...j, state: "running", progress: 4, stageIndex: 0, holdAt: 100, error: null }
            : j
        )
      );
      const j = jobs.find((x) => x.id === id);
      addLog("info", `Would retry "${j?.title}" from the start`, id);
      toast.success(`Would retry "${truncate(j?.title || "job", 28)}"`);
      setSelectedJobId(id);
      setScreen("progress");
    },
    [jobs, addLog]
  );

  const cancelJob = useCallback(
    (id) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? { ...j, state: "failed", error: "Cancelled by user", failedAt: Date.now() }
            : j
        )
      );
      const j = jobs.find((x) => x.id === id);
      addLog("warn", `Would cancel "${j?.title}"`, id);
      toast(`Would cancel "${truncate(j?.title || "job", 28)}"`);
    },
    [jobs, addLog]
  );

  const pauseJob = useCallback(
    (id) => {
      const j = jobs.find((x) => x.id === id);
      addLog("info", `Would pause "${j?.title}"`, id);
      toast(`Would pause "${truncate(j?.title || "job", 28)}"`);
    },
    [jobs, addLog]
  );

  const removeJob = useCallback(
    (id) => {
      const j = jobs.find((x) => x.id === id);
      setJobs((prev) => prev.filter((x) => x.id !== id));
      toast(`Would remove "${truncate(j?.title || "job", 28)}" from queue`);
    },
    [jobs]
  );

  const clearCompleted = useCallback(() => {
    const count = jobs.filter((j) => j.state === "completed").length;
    if (!count) {
      toast("No completed jobs to clear");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.state !== "completed"));
    toast(`Would clear ${count} completed job${count > 1 ? "s" : ""}`);
  }, [jobs]);

  const reorderHint = useCallback(() => {
    toast("Would reorder the queue");
  }, []);

  // ---- settings ----
  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    const labels = {
      outputLocation: "Output location",
      namingStyle: "File naming style",
      overwrite: "Overwrite behavior",
      packageFormat: "Package format",
      includeManifest: "Manifest in package",
      autoZip: "Auto-package results",
      defaultQuality: "Default quality",
      defaultOutputType: "Default output type",
      transcriptFormat: "Transcript format",
      audioFormat: "Preferred audio format",
      confirmDestructive: "Confirm destructive actions",
      expGpuAccel: "GPU acceleration (experimental)",
      expDiarization: "Speaker diarization (experimental)",
      expLosslessStems: "Lossless stems (experimental)",
    };
    const label = labels[key] || key;
    if (typeof value === "boolean") {
      toast(`${label} ${value ? "enabled" : "disabled"}`);
    } else {
      toast(`${label} set to ${value}`);
    }
  }, []);

  // Dark-only: setTheme is a stub — no light mode in Cigs.
  // Exposed so SettingsScreen renders without errors; clicking "Light" explains the design.
  const setTheme = useCallback((t) => {
    if (t === "light") toast("Cigs is dark-only — no light mode");
  }, []);

  const value = {
    theme: "dark",
    setTheme,
    screen,
    navigate,
    selectedJobId,
    setSelectedJobId,
    selectedLogId,
    setSelectedLogId,
    jobs,
    logs,
    addLog,
    settings,
    updateSetting,
    builder,
    patchBuilder,
    resetBuilder,
    startJob,
    addToQueue,
    startQueued,
    retryJob,
    cancelJob,
    pauseJob,
    removeJob,
    clearCompleted,
    reorderHint,
  };

  return <CigsContext.Provider value={value}>{children}</CigsContext.Provider>;
};
