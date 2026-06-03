import { useEffect, useState } from 'react'
import { Hud } from '@/surfaces/Hud'
import { UrlField } from '@/surfaces/UrlField/UrlField'
import { PrimaryCta } from '@/surfaces/PrimaryCta/PrimaryCta'
import { BRANCHES } from '@/state/branches'

/* Phase 3 surface. Layout zones in their final positions; HUD is real;
   URL field and CTA are placeholder shells. The state below is local
   and only exists so the HUD states are visually testable without an
   engine — Phase 4 replaces it with real Tauri-bound state.
   Keyboard: 1 idle, 2 running, 3 done. */

export default function App() {
  const [url, setUrl] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0].id)
  const [state, setState] = useState('idle')
  const [progress, setProgress] = useState(0)

  // local visual state cycler (dev only — gone in Phase 4)
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '1') setState('idle')
      if (e.key === '2') setState('running')
      if (e.key === '3') setState('done')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // simulated progress when running (purely visual — gone in Phase 4)
  useEffect(() => {
    if (state !== 'running') return
    setProgress(0)
    const start = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 6000)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setState('done')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [state])

  // auto-return done -> idle after the check animation
  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(() => {
      setState('idle')
      setProgress(0)
    }, 600)
    return () => clearTimeout(t)
  }, [state])

  const ctaEnabled = url.length > 0 && !!selectedBranch && state === 'idle'

  return (
    <main
      data-testid="app-surface"
      className="h-screen w-screen bg-bg text-text flex flex-col items-center"
    >
      <div className="h-10" /> {/* traffic-light reserved zone */}

      <div className="flex-1 w-full flex flex-col items-center justify-between py-6 px-10">
        <UrlField value={url} onChange={setUrl} disabled={state !== 'idle'} />

        <Hud
          state={state}
          progress={progress}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
        />

        <PrimaryCta enabled={ctaEnabled} onClick={() => setState('running')} />
      </div>
    </main>
  )
}
