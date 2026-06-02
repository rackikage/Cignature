import React from "react";
import { cn } from "@/lib/utils";
import { useCigs } from "@/context/CigsContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NAMING_STYLES,
  TRANSCRIPT_FORMATS,
  AUDIO_FORMATS,
  LOCAL_TOOLS,
  QUALITIES,
} from "@/data/seed";
import { HardDrive, FileCog, Cpu, CheckCircle2, ArrowUpCircle } from "lucide-react";

export default function SettingsScreen() {
  const { settings, updateSetting } = useCigs();

  return (
    <div className="cigs-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[860px] p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Preferences for the local pipeline — applied when the engine lands.</p>
        </div>

        <div className="space-y-5">
          {/* Smart Delivery */}
          <Section icon={HardDrive} title="Smart delivery">
            <Row label="Output location" hint="Where packaged results would be written">
              <Input
                data-testid="settings-output-location"
                value={settings.outputLocation}
                onChange={(e) => updateSetting("outputLocation", e.target.value)}
                className="mono h-9 w-[260px] bg-background text-xs"
              />
            </Row>
            <Row label="File naming style" hint="Template for generated filenames">
              <Picker testid="settings-naming-style" value={settings.namingStyle} options={NAMING_STYLES} onChange={(v) => updateSetting("namingStyle", v)} mono />
            </Row>
            <Row label="Smart packaging" hint="Auto-ZIP, safe naming, never overwrites">
              <Switch data-testid="settings-auto-zip" checked={settings.autoZip} onCheckedChange={(v) => updateSetting("autoZip", v)} />
            </Row>
          </Section>

          {/* Processing */}
          <Section icon={FileCog} title="Processing defaults">
            <Row label="Default quality" hint="Preset selected for new jobs">
              <Picker testid="settings-default-quality" value={settings.defaultQuality} options={QUALITIES.map((q) => q.key)} onChange={(v) => updateSetting("defaultQuality", v)} />
            </Row>
            <Row label="Transcript format" hint="Output format for speech-to-text">
              <Picker testid="settings-transcript-format" value={settings.transcriptFormat} options={TRANSCRIPT_FORMATS} onChange={(v) => updateSetting("transcriptFormat", v)} />
            </Row>
            <Row label="Preferred audio format" hint="Container for extracted audio">
              <Picker testid="settings-audio-format" value={settings.audioFormat} options={AUDIO_FORMATS} onChange={(v) => updateSetting("audioFormat", v)} />
            </Row>
          </Section>

          {/* Local tools */}
          <Section icon={Cpu} title="Local model / tool status">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LOCAL_TOOLS.map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
                  <div>
                    <div className="mono text-[12px] font-medium text-foreground">{t.name}</div>
                    <div className="mono text-[10px] text-muted-foreground">v{t.version}</div>
                  </div>
                  {t.status === "ready" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ color: "hsl(var(--warning))", borderColor: "hsl(var(--warning) / 0.35)", background: "hsl(var(--warning) / 0.12)" }}>
                      <ArrowUpCircle className="h-3 w-3" /> Update
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

const Section = ({ icon: Icon, title, children }) => (
  <section className="rounded-xl border border-border bg-card">
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-[12px] font-semibold uppercase tracking-wider text-foreground">{title}</h2>
    </div>
    <div className="divide-y divide-border">{children}</div>
  </section>
);

const Row = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
    <div className="min-w-0">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Picker = ({ value, options, onChange, mono, testid }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger data-testid={testid} className={cn("h-9 w-[200px] bg-background text-xs", mono && "mono")}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o} value={o} className={cn("text-xs", mono && "mono")}>{o}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);
