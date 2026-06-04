import { cn } from '@/lib/cn'

export function PrimaryCta({ enabled, onClick, label = 'Make it' }) {
  return (
    <button
      type="button"
      data-testid="primary-cta"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        'px-8 py-3 rounded-xl',
        'text-white font-extrabold tracking-tight text-[15px]',
        'transition-[transform,filter,box-shadow] duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright',
        enabled
          ? 'bg-gradient-primary shadow-[var(--ring-glow)] hover:brightness-110 active:scale-[0.98]'
          : 'bg-surface border border-border-strong text-text-faint cursor-not-allowed',
      )}
    >
      {label}
    </button>
  )
}
