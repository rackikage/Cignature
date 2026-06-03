import { useEffect } from 'react'
import { Hud } from '@/surfaces/Hud'
import { UrlField } from '@/surfaces/UrlField/UrlField'
import { PrimaryCta } from '@/surfaces/PrimaryCta/PrimaryCta'
import { SourcePreview } from '@/surfaces/SourcePreview/SourcePreview'
import { CancelConfirm } from '@/surfaces/CancelConfirm/CancelConfirm'
import { SetupBanner } from '@/surfaces/SetupBanner/SetupBanner'
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
  startSetupInstall,
  loadSettings,
  openSettings,
} from '@/state/cigs'

const GATED_BRANCHES = ['vocals', 'twin']

export default function App() {
  const url = useCigs((s) => s.url)
  const selectedBranch = useCigs((s) => s.selectedBranch)
  const jobState = useCigs((s) => s.jobState)
  const jobProgress = useCigs((s) => s.jobProgress)
  const urlStatus = useCigs((s) => s.urlStatus)
  const setupStatus = useCigs((s) => s.setupStatus)

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

  // ESC during running triggers cancel-confirm
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
    if (branchNeedsSetup && setupStatus === 'installing') return 'Setting up…'
    if (branchNeedsSetup) return 'Set up first'
    return 'Make it'
  })()

  const ctaAction = () => {
    if (branchNeedsSetup && setupStatus !== 'installing') {
      startSetupInstall()
      return
    }
    startSelectedJob()
  }

  const gatedBranches = setupStatus === 'ready' ? [] : GATED_BRANCHES

  return (
    <main
      data-testid="app-surface"
      data-tauri-drag-region
      className="h-screen w-screen bg-bg text-text flex flex-col items-center relative overflow-hidden"
    >
      <div className="h-10 w-full flex items-center justify-end pr-3" data-tauri-drag-region>
        <button
          type="button"
          onClick={openSettings}
          aria-label="Settings"
          className="text-text-faint hover:text-text-muted text-xs px-2 py-1 rounded-md pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          Settings
        </button>
      </div>

      <SetupBanner />

      <div className="flex-1 w-full flex flex-col items-center justify-between py-6 px-10">
        <div className="w-full flex flex-col items-center gap-2">
          <UrlField value={url} onChange={setUrl} disabled={jobState !== 'idle'} />
          <SourcePreview />
          <HistoryNote />
        </div>

        <Hud
          state={hudState}
          progress={jobProgress}
          selectedBranch={selectedBranch}
          onSelectBranch={selectBranch}
          gatedBranches={gatedBranches}
        />

        <PrimaryCta
          enabled={ctaEnabled || (branchNeedsSetup && setupStatus !== 'installing')}
          onClick={ctaAction}
          label={ctaLabel}
        />
      </div>

      <CancelConfirm />
      <SettingsSheet />
    </main>
  )
}
