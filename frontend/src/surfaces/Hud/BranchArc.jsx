import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { BRANCHES } from '@/state/branches'
import { HUD_SIZE, HUD_RADIUS } from './ProgressRing'

/* The four-position branch picker on the HUD arc.
   Labels sit outside the ring at top/right/bottom/left.
   Doctrine: selected branch label is the only brand-bold text at idle. */

const LABEL_OFFSET = 38
const CENTER = HUD_SIZE / 2

const POSITIONS = {
  top:    { x: CENTER, y: CENTER - HUD_RADIUS - LABEL_OFFSET, align: 'center', dx: '-50%', dy: '-100%' },
  right:  { x: CENTER + HUD_RADIUS + LABEL_OFFSET, y: CENTER, align: 'left',   dx: '0%',   dy: '-50%' },
  bottom: { x: CENTER, y: CENTER + HUD_RADIUS + LABEL_OFFSET, align: 'center', dx: '-50%', dy: '0%' },
  left:   { x: CENTER - HUD_RADIUS - LABEL_OFFSET, y: CENTER, align: 'right',  dx: '-100%', dy: '-50%' },
}

export function BranchArc({ selectedId, onSelect, dimmed = false, gatedIds = [] }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden={dimmed}>
      {BRANCHES.map((b) => {
        const pos = POSITIONS[b.position]
        const selected = selectedId === b.id
        const gated = gatedIds.includes(b.id)
        return (
          <motion.button
            key={b.id}
            type="button"
            data-testid={`branch-${b.id}`}
            onClick={() => onSelect?.(b.id)}
            disabled={dimmed}
            initial={false}
            animate={{ opacity: dimmed ? 0.35 : 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute pointer-events-auto select-none',
              'whitespace-nowrap leading-tight',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright rounded-md px-2 py-1',
              dimmed && 'cursor-default',
            )}
            style={{
              left: pos.x,
              top: pos.y,
              transform: `translate(${pos.dx}, ${pos.dy})`,
              textAlign: pos.align,
            }}
          >
            <div
              className={cn(
                'text-sm tracking-tight transition-colors duration-200 flex items-center justify-center gap-1.5',
                selected ? 'font-bold text-primary-bright' : 'font-normal text-text-muted hover:text-text',
                gated && !selected && 'text-text-faint',
              )}
            >
              {b.label}
              {gated && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-info/60"
                  aria-label="needs setup"
                />
              )}
            </div>
            <div className="text-[11px] text-text-faint mt-0.5">{b.blurb}</div>
          </motion.button>
        )
      })}
    </div>
  )
}
