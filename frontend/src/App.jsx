import { useEffect } from 'react'
import { Hud } from '@/surfaces/Hud'
import { UrlField } from '@/surfaces/UrlField/UrlField'
import { PrimaryCta } from '@/surfaces/PrimaryCta/PrimaryCta'
import { SourcePreview } from '@/surfaces/SourcePreview/SourcePreview'
import { CancelConfirm } from '@/surfaces/CancelConfirm/CancelConfirm'
import { SettingsSheet } from '@/surfaces/SettingsSheet/SettingsSheet'
import { HistoryNote } from '@/surfaces/HistoryNote/HistoryNote'
import {
  useCigs,
  setUrl,
  selectBranch,
  startSelectedJob,
  requestCancel,
  startEngineSubscription,
  stopEngineSubscription,
  startSetupSubscription,
  stopSetupSubscription,
  checkSetup,
  loadSettings,
  openSettings,
} from '@/state/cigs'

const GATED_BRANCHES = ['vocals', 'twin']

function folderTail(p) {
  if (!p) return 'Desktop'
  const clean = p.replace(/\/+$/, '')
  const parts = clean.split('/')
  return parts[parts.length - 1] || 'Desktop'
}

export default function App() {
  const url = useCigs((s) => s.url)
  const selectedBranch = useCigs((s) => s.selectedBranch)
  const jobState = useCigs((s) => s.jobState)
  const jobProgress = useCigs((s) => s.jobProgress)
  const jobStage = useCigs((s) => s.jobStage)
  const jobBranch = useCigs((s) => s.jobBranch)
  const urlStatus = useCigs((s) => s.urlStatus)
  const setupStatus = useCigs((s) => s.setupStatus)
  const outputFolder = useCigs((s) => s.settings.outputFolder)

  useEffect(() => {
    startEngineSubscription()
    startSetupSubscription()
    checkSetup()
    loadSettings()
    return () => {
      stopEngineSubscription()
      stopSetupSubscription()
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape' && jobState === 'running') {
        requestCancel()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        openSettings()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jobState])

  const hudState =
    jobState === 'running' ? 'running' : jobState === 'done' ? 'done' : 'idle'

  const branchNeedsSetup =
    GATED_BRANCHES.includes(selectedBranch) && setupStatus !== 'ready'

  const ctaEnabled =
    urlStatus === 'ok' &&
    !!selectedBranch &&
    jobState === 'idle' &&
    !branchNeedsSetup

  const ctaLabel = (() => {
    if (jobState === 'running') return 'Working…'
    if (branchNeedsSetup) return 'Tools needed'
    return 'Make it'
  })()

  const gatedBranches = setupStatus === 'ready' ? [] : GATED_BRANCHES

  return (
    <main
      data-testid="app-surface"
      data-tauri-drag-region
      className="h-screen w-screen bg-bg text-text flex flex-col items-center relative overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 40%, rgba(124,92,255,0.07), transparent 62%)',
      }}
    >
      <div
        className="h-11 w-full flex items-center justify-end gap-2 pr-3 pl-20"
        data-tauri-drag-region
      >
        <button
          type="button"
          onClick={openSettings}
          className="text-[11px] font-bold tracking-tight text-text-muted hover:text-text border border-border hover:border-border-strong rounded-md px-2.5 py-1 bg-surface/60 transition-colors"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Change output folder"
        >
          <span className="text-text-faint mr-1 font-medium">Output</span>
          {folderTail(outputFolder)}
        </button>
        <button
          type="button"
          onClick={openSettings}
          aria-label="Settings"
          className="text-[11px] font-extrabold tracking-wider uppercase text-text border border-border-strong hover:border-primary-bright hover:text-primary-bright rounded-md px-3 py-1 bg-surface/60 transition-colors"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          Settings
        </button>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-between py-3 px-8">
        <div className="w-full flex flex-col items-center gap-2">
          <UrlField value={url} onChange={setUrl} disabled={jobState !== 'idle'} />
          <SourcePreview />
          <HistoryNote />
        </div>

        <Hud
          state={hudState}
          progress={jobProgress}
          stage={jobStage}
          jobBranch={jobBranch}
          selectedBranch={selectedBranch}
          onSelectBranch={selectBranch}
          gatedBranches={gatedBranches}
        />

        <PrimaryCta enabled={ctaEnabled} onClick={startSelectedJob} label={ctaLabel} />
      </div>

      <CancelConfirm />
      <SettingsSheet />
    </main>
  )
}
