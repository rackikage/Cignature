import { useCigs } from '@/state/cigs'

/* One quiet line: title · platform · duration.
   On 'unavailable' we replace it with the single user-visible failure line.
   Doctrine: no red, no toast — one sharp muted sentence. */

function formatDuration(sec) {
  if (typeof sec !== 'number' || !isFinite(sec) || sec <= 0) return null
  const total = Math.round(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function SourcePreview() {
  const status = useCigs((s) => s.urlStatus)
  const source = useCigs((s) => s.source)

  if (status === 'idle') return <div data-testid="source-preview" className="h-5" />

  if (status === 'probing') {
    return (
      <div data-testid="source-preview" className="text-sm text-text-faint tracking-tight">
        Checking…
      </div>
    )
  }

  if (status === 'unavailable') {
    return (
      <div data-testid="source-unavailable" className="text-sm text-text-muted tracking-tight">
        URL not available.
      </div>
    )
  }

  if (status === 'ok' && source) {
    const dur = formatDuration(source.durationSec)
    const parts = [source.title, source.platform, dur].filter(Boolean)
    return (
      <div data-testid="source-preview" className="text-sm text-text-muted tracking-tight max-w-[640px] truncate text-center">
        {parts.join(' · ')}
      </div>
    )
  }

  return <div className="h-5" />
}
