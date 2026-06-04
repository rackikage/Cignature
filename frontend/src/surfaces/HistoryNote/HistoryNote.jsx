import { useCigs } from '@/state/cigs'

const BRANCH_LABEL = {
  audio: 'Audio Only',
  transcript: 'Transcript',
  vocals: 'Vocals Only',
  twin: 'Audio Twin Pack',
}

function formatDate(sec) {
  if (!sec) return ''
  const d = new Date(sec * 1000)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function HistoryNote() {
  const dup = useCigs((s) => s.duplicateOf)
  if (!dup) return null

  const branch = BRANCH_LABEL[dup.branch] || dup.branch
  const when = formatDate(dup.completedAt)

  return (
    <div data-testid="history-note" className="text-xs text-info/80 tracking-tight">
      You already made {branch} from this{when && ` on ${when}`}.
    </div>
  )
}
