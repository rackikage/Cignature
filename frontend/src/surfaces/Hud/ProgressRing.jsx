import { motion } from 'framer-motion'

/* The HUD ring. Three layers:
   - Static outline (always visible)
   - Progress arc (gradient, fills clockwise, breath-pulses)
   - Center stage text (running only) — "Downloading 23%" / etc.
   Author override on doctrine: stage + % appear in the center during runs. */

const SIZE = 360
const CENTER = SIZE / 2
const RADIUS = 138
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const STAGE_LABEL = {
  audio: {
    fetching: 'Downloading',
    processing: 'Encoding',
    finalizing: 'Wrapping up',
  },
  transcript: {
    fetching: 'Downloading',
    processing: 'Transcribing',
    finalizing: 'Wrapping up',
  },
  vocals: {
    fetching: 'Downloading',
    processing: 'Separating',
    finalizing: 'Wrapping up',
  },
  twin: {
    fetching: 'Downloading',
    processing: 'Separating',
    finalizing: 'Wrapping up',
  },
}

function labelFor(branch, stage) {
  if (!stage) return 'Working'
  return STAGE_LABEL[branch]?.[stage] ?? 'Working'
}

export function ProgressRing({ state, progress = 0, stage, branch }) {
  const running = state === 'running'
  const done = state === 'done'

  const dashoffset = CIRCUMFERENCE * (1 - progress)
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)))

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0"
        aria-hidden
      >
        <defs>
          <linearGradient id="hud-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--live)" />
          </linearGradient>
        </defs>

        {/* static outline */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={1.5}
        />

        {/* progress arc + soft breathing pulse during running */}
        {(running || done) && (
          <motion.g
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
            animate={running ? { scale: [1, 1.014, 1] } : { scale: 1 }}
            transition={running ? { duration: 2.2, ease: 'easeInOut', repeat: Infinity } : { duration: 0.25 }}
          >
            <motion.circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="url(#hud-ring-grad)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={done ? 0 : dashoffset}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              animate={{ strokeDashoffset: done ? 0 : dashoffset }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: 'drop-shadow(0 0 14px rgba(124, 92, 255, 0.55))' }}
            />
          </motion.g>
        )}
      </svg>

      {/* center stage status — running only */}
      {running && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-[13px] uppercase tracking-[0.18em] text-text-muted font-bold">
            {labelFor(branch, stage)}
          </div>
          <div className="font-mono text-3xl font-extrabold text-text mt-1 tabular-nums">
            {pct}
            <span className="text-text-faint text-xl ml-0.5">%</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export const HUD_SIZE = SIZE
export const HUD_RADIUS = RADIUS
