/* Placeholder shell. The functional version lands in Phase 4 once
   the engine state machine and clipboard-on-focus prefill are wired. */

export function UrlField({ value = '', onChange, disabled = false }) {
  return (
    <div className="w-full max-w-[560px] mx-auto">
      <input
        data-testid="url-field"
        type="url"
        placeholder="Paste a URL"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="
          w-full px-4 py-3 rounded-lg
          bg-surface border border-border
          text-text placeholder:text-text-faint
          text-base tracking-tight
          focus:outline-none focus:border-border-strong
          transition-colors duration-200
          disabled:opacity-50
        "
        style={{ borderColor: 'var(--border)' }}
      />
    </div>
  )
}
