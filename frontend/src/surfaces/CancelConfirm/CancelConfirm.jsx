import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useCigs, dismissCancel, confirmCancel } from '@/state/cigs'

/* Small confirm. Doctrine permits destructive accent here. */

export function CancelConfirm() {
  const open = useCigs((s) => s.cancelConfirm)

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') dismissCancel()
      if (e.key === 'Enter') confirmCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={dismissCancel}
        >
          <motion.div
            data-testid="cancel-confirm"
            className="bg-surface-raise border border-border rounded-xl px-6 py-5 w-[340px]"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm text-text font-bold tracking-tight">Cancel this job?</div>
            <div className="text-xs text-text-muted mt-1">Partial output will be discarded.</div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={dismissCancel}
                className="px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text transition-colors"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="px-3 py-1.5 rounded-md text-sm font-bold text-white bg-destructive hover:brightness-110 transition-all"
              >
                Cancel job
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
