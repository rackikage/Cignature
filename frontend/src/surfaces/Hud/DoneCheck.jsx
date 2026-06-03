import { motion } from 'framer-motion'
import { HUD_SIZE } from './ProgressRing'

const CENTER = HUD_SIZE / 2

/* Brief check on completion. ~500ms then fades. Doctrine: the ring is
   the running signal; the check is just the closing punctuation. */

export function DoneCheck() {
  return (
    <svg
      width={HUD_SIZE}
      height={HUD_SIZE}
      viewBox={`0 0 ${HUD_SIZE} ${HUD_SIZE}`}
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    >
      <motion.path
        d={`M ${CENTER - 22} ${CENTER + 2} L ${CENTER - 6} ${CENTER + 18} L ${CENTER + 24} ${CENTER - 14}`}
        fill="none"
        stroke="var(--success)"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
        transition={{
          pathLength: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.5, times: [0, 0.2, 0.7, 1] },
        }}
      />
    </svg>
  )
}
