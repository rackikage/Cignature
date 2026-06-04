import { useCigs } from '@/state/cigs'

/* One quiet line: title · platform · duration.
   On 'unavailable' we map the engine reason to a single directive line. */

function formatDuration(sec) {
  if (typeof sec !== 'number' || !isFinite(sec) || sec <= 0) return null
  const total = Math.round(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const REASON_COPY = {
  'private':            'This link is private or restricted. Try a different URL.',
  'not-found':          'This video isn’t available anymore.',
  'network':            'Can’t reach the source. Check your connection.',
  'tool-missing':       'A required tool is missing. Open Settings to install.',
  'unsupported':        'Couldn’t read this link. Try a YouTube, SoundCloud, or direct media URL.',
  'processing-failed':  'Something went wrong while processing. Try again or pick a different URL.',
}

export function SourcePreview() {
  const status = useCigs((s) => s.urlStatus)
  const reason = useCigs((s) => s.urlReason)
  const source = useCigs((s) => s.source)

  if (status === 'idle') return <div data-testid="source-preview" className="h-5" />

  if (status === 'probing') {
    return (
      <div data-testid="source-preview" className="text-[13px] text-text-faint tracking-tight font-medium">
        Checking…
      </div>
    )
  }

  if (status === 'unavailable') {
    const line = REASON_COPY[reason] ?? REASON_COPY['unsupported']
    return (
      <div
        data-testid="source-unavailable"
        className="text-[13px] text-text-muted font-bold tracking-tight max-w-[640px] truncate text-center"
      >
        {line}
      </div>
    )
  }

  if (status === 'ok' && source) {
    const dur = formatDuration(source.durationSec)
    const parts = [source.title, source.platform, dur].filter(Boolean)
    return (
      <div
        data-testid="source-preview"
        className="text-[13px] text-text-muted font-medium tracking-tight max-w-[640px] truncate text-center"
      >
        {parts.join(' · ')}
      </div>
    )
  }

  return <div className="h-5" />
}
