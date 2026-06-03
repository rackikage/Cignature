import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import {
  useCigs,
  closeSettings,
  chooseOutputFolder,
  wipeHistory,
  startSetupInstall,
} from '@/state/cigs'

export function SettingsSheet() {
  const open = useCigs((s) => s.settingsOpen)
  const outputFolder = useCigs((s) => s.settings.outputFolder)
  const setupStatus = useCigs((s) => s.setupStatus)

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') closeSettings() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40 flex items-start justify-center bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closeSettings}
        >
          <motion.div
            data-testid="settings-sheet"
            className="mt-20 bg-surface-raise border border-border rounded-xl w-[480px] overflow-hidden"
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="text-sm font-bold tracking-tight">Settings</div>
              <button
                type="button"
                onClick={closeSettings}
                className="text-xs text-text-muted hover:text-text"
                aria-label="Close"
              >
                ESC
              </button>
            </div>

            <Row label="Output folder" hint={outputFolder || 'Desktop'}>
              <button
                type="button"
                onClick={chooseOutputFolder}
                className="text-xs font-bold text-text bg-surface border border-border hover:border-border-strong rounded-md px-3 py-1.5 transition-colors"
              >
                Choose…
              </button>
            </Row>

            <Row
              label="Vocals & Audio Twin setup"
              hint={
                setupStatus === 'ready'
                  ? 'Installed'
                  : setupStatus === 'installing'
                  ? 'Installing…'
                  : 'Not installed'
              }
            >
              <button
                type="button"
                onClick={startSetupInstall}
                disabled={setupStatus === 'ready' || setupStatus === 'installing'}
                className="text-xs font-bold text-text bg-surface border border-border hover:border-border-strong rounded-md px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {setupStatus === 'ready' ? 'Reinstall' : 'Install'}
              </button>
            </Row>

            <Row label="History" hint="Clears the duplicate-detect signal">
              <button
                type="button"
                onClick={wipeHistory}
                className="text-xs font-bold text-text bg-surface border border-border hover:border-destructive/50 hover:text-destructive rounded-md px-3 py-1.5 transition-colors"
              >
                Clear
              </button>
            </Row>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="px-5 py-4 border-b border-border last:border-b-0 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold tracking-tight text-text">{label}</div>
        <div className="text-xs text-text-muted mt-0.5 truncate">{hint}</div>
      </div>
      {children}
    </div>
  )
}
