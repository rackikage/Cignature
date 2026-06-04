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
  const setupError = useCigs((s) => s.setupError)

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') closeSettings() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const setupHint =
    setupStatus === 'ready' ? 'Installed and ready'
    : setupStatus === 'installing' ? 'Installing in the background…'
    : setupError ? setupError
    : 'Not installed — Vocals and The Mr Loco are unavailable'

  const setupBtnLabel =
    setupStatus === 'ready' ? 'Reinstall Tools'
    : setupStatus === 'installing' ? 'Installing…'
    : 'Install Tools'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40 flex items-start justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closeSettings}
        >
          <motion.div
            data-testid="settings-sheet"
            className="mt-16 bg-surface-raise border border-border-strong rounded-2xl w-[520px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="text-base font-extrabold tracking-tight">Settings</div>
              <button
                type="button"
                onClick={closeSettings}
                className="text-xs text-text-muted hover:text-text font-bold tracking-wider"
                aria-label="Close"
              >
                ESC
              </button>
            </div>

            <Row
              label="Output folder"
              hint={outputFolder || 'Desktop'}
              btnLabel="Choose Output Folder…"
              onClick={chooseOutputFolder}
            />

            <Row
              label="Vocals & The Mr Loco"
              hint={setupHint}
              btnLabel={setupBtnLabel}
              onClick={startSetupInstall}
              disabled={setupStatus === 'installing'}
            />

            <Row
              label="Job history"
              hint="Used to flag duplicate sources you’ve already pulled"
              btnLabel="Clear History"
              onClick={wipeHistory}
              destructive
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Row({ label, hint, btnLabel, onClick, disabled = false, destructive = false }) {
  return (
    <div className="px-6 py-5 border-b border-border last:border-b-0 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-extrabold tracking-tight text-text">{label}</div>
        <div className="text-xs text-text-muted mt-1 truncate">{hint}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          'text-xs font-bold whitespace-nowrap',
          'px-4 py-2 rounded-md border transition-colors',
          destructive
            ? 'border-border text-text bg-surface hover:border-destructive hover:text-destructive'
            : 'border-border-strong text-text bg-surface hover:border-primary-bright hover:text-primary-bright',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border-strong disabled:hover:text-text',
        ].join(' ')}
      >
        {btnLabel}
      </button>
    </div>
  )
}
