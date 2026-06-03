import { AnimatePresence, motion } from 'framer-motion'
import {
  useCigs,
  startSetupInstall,
  dismissSetupBanner,
} from '@/state/cigs'

/* Slim top banner. Appears when demucs isn't installed — the gate for
   Vocals Only and Audio Twin Pack. Non-blocking: user can use Audio
   Only and Transcript while this sits, or dismiss to a tiny corner pill
   for later. */

export function SetupBanner() {
  const status = useCigs((s) => s.setupStatus)
  const dismissed = useCigs((s) => s.setupBannerDismissed)
  const line = useCigs((s) => s.setupLine)
  const error = useCigs((s) => s.setupError)

  const hidden = status === 'unknown' || status === 'ready'
  const installing = status === 'installing'
  const installed = status === 'installed'

  if (hidden) return null

  if (dismissed && !installing) {
    return (
      <motion.button
        type="button"
        onClick={() => dismissSetupBanner()}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-3 right-3 z-30 text-xs text-text-faint hover:text-text-muted bg-surface border border-border rounded-full px-3 py-1 tracking-tight"
      >
        Set up Vocals & Twin
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        data-testid="setup-banner"
        className="absolute top-10 left-0 right-0 z-30 px-6 pointer-events-none"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mx-auto max-w-[820px] bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-4 pointer-events-auto">
          <div className="flex-1 min-w-0">
            {installing && (
              <>
                <div className="text-sm font-bold tracking-tight text-text">
                  Installing Demucs…
                </div>
                <div className="text-xs text-text-muted truncate mt-0.5 font-mono">
                  {line || 'Working…'}
                </div>
              </>
            )}
            {installed && (
              <div className="text-sm font-bold tracking-tight text-success">
                Ready. Vocals and Audio Twin are available.
              </div>
            )}
            {!installing && !installed && (
              <>
                <div className="text-sm font-bold tracking-tight text-text">
                  Vocals & Audio Twin need a one-time setup.
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  About 2.5 GB · ~5–10 minutes on a fast connection.
                  {error && <span className="text-destructive ml-2">{error}</span>}
                </div>
              </>
            )}
          </div>

          {installing ? (
            <ProgressDots />
          ) : installed ? null : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={dismissSetupBanner}
                className="text-xs text-text-muted hover:text-text px-3 py-1.5 rounded-md transition-colors"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={startSetupInstall}
                className="text-xs font-bold text-white bg-gradient-primary px-3 py-1.5 rounded-md shadow-[0_0_16px_rgba(124,92,255,0.3)] hover:brightness-110 transition-all"
              >
                Set up
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ProgressDots() {
  return (
    <div className="flex gap-1.5 px-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-live"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}
