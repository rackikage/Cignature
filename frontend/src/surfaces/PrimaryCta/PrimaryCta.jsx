import { cn } from '@/lib/cn'

/* Placeholder shell. Final wording locks in Phase 9. */

export function PrimaryCta({ enabled, onClick, label = 'Make it' }) {
  return (
    <button
      type="button"
      data-testid="primary-cta"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        'px-6 py-2.5 rounded-lg',
        'text-white font-bold tracking-tight text-sm',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright',
        enabled
          ? 'bg-gradient-primary shadow-[0_0_24px_rgba(124,92,255,0.35)] hover:brightness-110 active:scale-[0.98]'
          : 'bg-surface border border-border text-text-faint cursor-not-allowed',
      )}
    >
      {label}
    </button>
  )
}
