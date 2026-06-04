import { motion } from 'framer-motion'
import { HUD_SIZE } from './ProgressRing'

const CENTER = HUD_SIZE / 2

/* On completion: a big neon-green check + "Done" label.
   Held visibly (~1.5s) before the store transitions back to idle. */

export function DoneCheck() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <svg
        width={HUD_SIZE}
        height={HUD_SIZE}
        viewBox={`0 0 ${HUD_SIZE} ${HUD_SIZE}`}
        className="absolute inset-0"
        aria-hidden
      >
        <motion.path
          d={`M ${CENTER - 36} ${CENTER - 2} L ${CENTER - 8} ${CENTER + 26} L ${CENTER + 40} ${CENTER - 26}`}
          fill="none"
          stroke="var(--success)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: 'drop-shadow(var(--success-glow))' }}
        />
      </svg>

      <motion.div
        className="relative mt-[110px] text-success font-extrabold uppercase tracking-[0.32em] text-sm"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.18 }}
      >
        Done
      </motion.div>
    </motion.div>
  )
}
