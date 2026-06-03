import { useEffect } from 'react'
import { Hud } from '@/surfaces/Hud'
import { UrlField } from '@/surfaces/UrlField/UrlField'
import { PrimaryCta } from '@/surfaces/PrimaryCta/PrimaryCta'
import { SourcePreview } from '@/surfaces/SourcePreview/SourcePreview'
import { CancelConfirm } from '@/surfaces/CancelConfirm/CancelConfirm'
import {
  useCigs,
  setUrl,
  selectBranch,
  startSelectedJob,
  requestCancel,
  startEngineSubscription,
  stopEngineSubscription,
} from '@/state/cigs'

export default function App() {
  const url = useCigs((s) => s.url)
  const selectedBranch = useCigs((s) => s.selectedBranch)
  const jobState = useCigs((s) => s.jobState)
  const jobProgress = useCigs((s) => s.jobProgress)
  const urlStatus = useCigs((s) => s.urlStatus)

  useEffect(() => {
    startEngineSubscription()
    return () => stopEngineSubscription()
  }, [])

  // ESC during running triggers cancel-confirm
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape' && jobState === 'running') {
        requestCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jobState])

  // map store job state -> HUD state
  const hudState =
    jobState === 'running' ? 'running' : jobState === 'done' ? 'done' : 'idle'

  const ctaEnabled =
    urlStatus === 'ok' && !!selectedBranch && jobState === 'idle'

  return (
    <main
      data-testid="app-surface"
      data-tauri-drag-region
      className="h-screen w-screen bg-bg text-text flex flex-col items-center relative overflow-hidden"
    >
      <div className="h-10 w-full" data-tauri-drag-region /> {/* traffic-light reserved zone */}

      <div className="flex-1 w-full flex flex-col items-center justify-between py-6 px-10">
        <div className="w-full flex flex-col items-center gap-3">
          <UrlField value={url} onChange={setUrl} disabled={jobState !== 'idle'} />
          <SourcePreview />
        </div>

        <Hud
          state={hudState}
          progress={jobProgress}
          selectedBranch={selectedBranch}
          onSelectBranch={selectBranch}
        />

        <PrimaryCta
          enabled={ctaEnabled}
          onClick={startSelectedJob}
          label={jobState === 'running' ? 'Working…' : 'Make it'}
        />
      </div>

      <CancelConfirm />
    </main>
  )
}
