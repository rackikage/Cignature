import { motion } from 'framer-motion'

/* The HUD ring. Two layers:
   - Static outline (always visible)
   - Progress arc (running state, violet -> magenta gradient, fills clockwise)
   Doctrine: ring is the signal. No text inside the center. */

const SIZE = 360
const CENTER = SIZE / 2
const RADIUS = 138
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ProgressRing({ state, progress = 0 }) {
  const running = state === 'running'
  const done = state === 'done'

  const dashoffset = CIRCUMFERENCE * (1 - progress)

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="absolute inset-0 pointer-events-none"
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

      {/* progress arc — only renders during running/done */}
      {(running || done) && (
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="url(#hud-ring-grad)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={done ? 0 : dashoffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          animate={{ strokeDashoffset: done ? 0 : dashoffset }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: 'drop-shadow(0 0 8px rgba(124, 92, 255, 0.35))' }}
        />
      )}
    </svg>
  )
}

export const HUD_SIZE = SIZE
export const HUD_RADIUS = RADIUS
