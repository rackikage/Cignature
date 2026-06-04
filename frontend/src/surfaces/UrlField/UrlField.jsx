export function UrlField({ value = '', onChange, disabled = false }) {
  return (
    <div className="w-full max-w-[580px] mx-auto">
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
          w-full px-4 py-3.5 rounded-xl
          bg-surface-raise border border-border-strong
          text-text placeholder:text-text-faint
          text-[15px] font-semibold tracking-tight
          focus:outline-none focus:border-primary-bright
          focus:shadow-[0_0_0_3px_rgba(124,92,255,0.18)]
          transition-[border-color,box-shadow] duration-200
          disabled:opacity-50
        "
      />
    </div>
  )
}
