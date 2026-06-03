import { motion, useReducedMotion } from 'framer-motion'
import { useHudMotion } from './useHudMotion'
import { ProgressRing, HUD_SIZE } from './ProgressRing'
import { BranchArc } from './BranchArc'
import { DoneCheck } from './DoneCheck'

/* The HUD. Centerpiece. Only thing that moves on the surface.
   FRAME_PAD reserves space around the ring so branch-arc labels
   (which sit outside the ring) stay within the HUD's layout box
   and never overlap the URL field or CTA above and below.
   States:
     - idle:    static ring, branch arc visible, idle drift + cursor tilt
     - running: ring fills clockwise violet -> magenta, branches dimmed, no drift
     - done:    full ring + check ~500ms, then idle */

const FRAME_PAD = 56
const FRAME_SIZE = HUD_SIZE + FRAME_PAD * 2

const IDLE_DRIFT = {
  y: [0, -3, 0, 3, 0],
  transition: { duration: 9, ease: 'easeInOut', repeat: Infinity },
}

export function Hud({ state = 'idle', progress = 0, selectedBranch, onSelectBranch, gatedBranches = [] }) {
  const reducedMotion = useReducedMotion() === true
  const running = state === 'running'
  const done = state === 'done'

  const { ref, rotateX, rotateY } = useHudMotion({
    reducedMotion,
    frozen: running,
  })

  return (
    <div
      ref={ref}
      data-testid="hud-frame"
      style={{
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        position: 'relative',
        perspective: 1200,
        willChange: 'transform',
      }}
    >
      <motion.div
        className="absolute"
        style={{
          inset: FRAME_PAD,
          willChange: 'transform',
        }}
        animate={reducedMotion || running ? undefined : IDLE_DRIFT}
      >
        <motion.div
          data-testid="hud"
          data-state={state}
          className="relative w-full h-full"
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          <ProgressRing state={state} progress={progress} />
          {done && <DoneCheck />}
          <BranchArc
            selectedId={selectedBranch}
            onSelect={onSelectBranch}
            dimmed={running || done}
            gatedIds={gatedBranches}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
